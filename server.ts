import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PROTOCOL_VERSION = '1.0.0';

interface CharacterCustomizationSync {
  hairColor: string;
  skinTone: string;
  faceStyle: string;
  hairStyle: string;
  clothingStyle: string;
  shoeStyle: string;
  accessory: string;
  heightScale: number;
  buildScale: number;
}

interface PlayerSyncState {
  id: string;
  name: string;
  gender: 'male' | 'female';
  outfitColor: string;
  customization: CharacterCustomizationSync;
  animState: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  inVehicleId: string | null;
  vehicleType: string | null;
  vehicleColor: string | null;
  region: string;
  speed: number;
  lastUpdated: number;
}

const VALID_FACES = new Set(['oval', 'angular', 'broad']);
const VALID_HAIRS = new Set(['short_taper', 'layered_long', 'top_knot', 'slick_back', 'braid']);
const VALID_CLOTHING = new Set(['urban_parka', 'nepali_daura', 'kathmandu_street', 'trekking_vest', 'formal_blazer']);
const VALID_SHOES = new Set(['sneakers', 'hiking_boots', 'dress_shoes']);
const VALID_ACCESSORIES = new Set(['none', 'sunglasses', 'dhaka_topi', 'scarf', 'backpack']);
const VALID_ANIMS = new Set([
  'idle', 'walk', 'run', 'sprint', 'jump', 'fall', 'crouch', 'swim',
  'climb', 'drive', 'enter_vehicle', 'exit_vehicle', 'combat', 'interact', 'talk', 'sit',
]);

function sanitizeCustomization(raw: unknown): CharacterCustomizationSync {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const clampNum = (v: unknown, min: number, max: number, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  return {
    hairColor: typeof obj.hairColor === 'string' ? obj.hairColor.slice(0, 16) : '#1e1b18',
    skinTone: typeof obj.skinTone === 'string' ? obj.skinTone.slice(0, 16) : '#d49a73',
    faceStyle: VALID_FACES.has(String(obj.faceStyle)) ? String(obj.faceStyle) : 'oval',
    hairStyle: VALID_HAIRS.has(String(obj.hairStyle)) ? String(obj.hairStyle) : 'short_taper',
    clothingStyle: VALID_CLOTHING.has(String(obj.clothingStyle)) ? String(obj.clothingStyle) : 'urban_parka',
    shoeStyle: VALID_SHOES.has(String(obj.shoeStyle)) ? String(obj.shoeStyle) : 'hiking_boots',
    accessory: VALID_ACCESSORIES.has(String(obj.accessory)) ? String(obj.accessory) : 'backpack',
    heightScale: clampNum(obj.heightScale, 0.9, 1.12, 1.0),
    buildScale: clampNum(obj.buildScale, 0.88, 1.15, 1.0),
  };
}

interface RoomClient {
  ws: WebSocket;
  playerId: string;
  playerName: string;
  ip: string;
  lastChatAt: number;
  lastRewardAt: number;
  claimedMissions: Set<string>;
  reportsReceived: number;
}

interface CoOpRoom {
  code: string;
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  hostId: string;
  weather: string;
  timeOfDay: number;
  activeMissionId: string | null;
  clients: Map<string, RoomClient>;
  states: Map<string, PlayerSyncState>;
  createdAt: number;
}

const VALID_MISSION_REWARDS: Record<string, { money: number; xp: number }> = {
  m1_kathmandu_arrival: { money: 1500, xp: 150 },
  m2_pokhara_courier: { money: 3200, xp: 300 },
  m3_terai_intercept: { money: 5000, xp: 450 },
  m4_monsoon_escape: { money: 6500, xp: 600 },
  m5_himalayan_rescue: { money: 9500, xp: 900 },
  side_race_ringroad: { money: 2500, xp: 220 },
  side_taxi_durbar: { money: 1800, xp: 160 },
  side_landmark_tour: { money: 2000, xp: 200 },
};

const BANNED_WORDS = ['spam', 'scam', 'hack', 'cheat', 'exploit'];

const rooms = new Map<string, CoOpRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function sanitizeChat(text: string): { clean: string; flagged: boolean } {
  let flagged = false;
  let clean = text.trim().slice(0, 180);
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(clean)) {
      flagged = true;
      clean = clean.replace(regex, '***');
    }
  }
  return { clean, flagged };
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: CoOpRoom, payload: unknown, excludeId?: string): void {
  const serialized = JSON.stringify(payload);
  for (const [pid, client] of room.clients.entries()) {
    if (pid !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(serialized);
    }
  }
}

function getRoomSnapshot(room: CoOpRoom) {
  return {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    weather: room.weather,
    timeOfDay: room.timeOfDay,
    activeMissionId: room.activeMissionId,
    players: Array.from(room.states.values()),
  };
}

function collectFilesRecursive(dir: string, baseDir: string, out: Array<{ path: string; size: number; content: string }>) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFilesRecursive(full, baseDir, out);
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      const stat = fs.statSync(full);
      const content = fs.readFileSync(full, 'utf8');
      out.push({ path: rel, size: stat.size, content });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, protocol: PROTOCOL_VERSION, activeRooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.isPublic)
      .map((r) => ({
        code: r.code,
        name: r.name,
        playerCount: r.clients.size,
        maxPlayers: r.maxPlayers,
        weather: r.weather,
      }));
    res.json({ rooms: publicRooms });
  });

  app.get('/api/unity-project/files', (_req, res) => {
    const unityDir = path.join(__dirname, 'unity-project');
    const files: Array<{ path: string; size: number; content: string }> = [];
    collectFilesRecursive(unityDir, unityDir, files);
    res.json({
      projectRoot: 'unity-project/',
      fileCount: files.length,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
    });
  });

  const RELEASE_FILES = [
    'AARYA_CITY_COMPLETE_SOURCE.zip',
    'README_INSTALLATION.md',
    'BUILD_INSTRUCTIONS.md',
    'MULTIPLAYER_SETUP.md',
    'CHANGELOG.md',
  ];

  app.get('/api/release/manifest', (_req, res) => {
    const releaseDir = path.join(__dirname, 'AARYA_CITY_RELEASE');
    const items = RELEASE_FILES.filter((name) => fs.existsSync(path.join(releaseDir, name))).map(
      (name) => {
        const full = path.join(releaseDir, name);
        const buf = fs.readFileSync(full);
        const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        return {
          name,
          size: buf.length,
          sha256,
          downloadUrl: `/api/release/download/${encodeURIComponent(name)}`,
        };
      },
    );
    res.json({
      packageId: 'com.aaryadigitalworld.aaryacity',
      unityVersion: '6000.0.28f1',
      unityEditorInstalled: false,
      androidSdkInstalled: false,
      items,
    });
  });

  app.get('/api/release/download/:filename', (req, res) => {
    const filename = String(req.params.filename || '');
    if (!RELEASE_FILES.includes(filename)) {
      res.status(404).json({ error: 'Release file not found.' });
      return;
    }
    const full = path.join(__dirname, 'AARYA_CITY_RELEASE', filename);
    if (!fs.existsSync(full)) {
      res.status(404).json({ error: 'Release file missing on disk.' });
      return;
    }
    res.download(full, filename);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/multiplayer' });

  wss.on('connection', (ws, req) => {
    let currentRoom: CoOpRoom | null = null;
    let currentPlayerId: string | null = null;
    const ip = String(req.socket.remoteAddress || 'unknown');

    const leaveCurrentRoom = () => {
      if (!currentRoom || !currentPlayerId) return;
      currentRoom.clients.delete(currentPlayerId);
      currentRoom.states.delete(currentPlayerId);

      if (currentRoom.clients.size === 0) {
        rooms.delete(currentRoom.code);
      } else {
        if (currentRoom.hostId === currentPlayerId) {
          const nextHost = currentRoom.clients.keys().next().value;
          if (nextHost) {
            currentRoom.hostId = nextHost;
          }
        }
        broadcastRoom(currentRoom, {
          type: 'player_left',
          playerId: currentPlayerId,
          hostId: currentRoom.hostId,
        });
      }
      currentRoom = null;
      currentPlayerId = null;
    };

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        sendJson(ws, { type: 'error', code: 'INVALID_JSON', message: 'Malformed message payload.' });
        return;
      }

      const type = String(msg.type || '');

      if (type === 'create_room' || type === 'join_room' || type === 'quick_join') {
        const version = String(msg.version || '');
        if (version && version !== PROTOCOL_VERSION) {
          sendJson(ws, {
            type: 'error',
            code: 'VERSION_MISMATCH',
            message: `Client protocol ${version} does not match server ${PROTOCOL_VERSION}.`,
          });
          return;
        }

        const playerId = String(msg.playerId || `p_${Math.random().toString(36).slice(2, 9)}`);
        const playerName = String(msg.playerName || 'Traveler').trim().slice(0, 20) || 'Traveler';
        const gender = msg.gender === 'female' ? 'female' : 'male';
        const outfitColor = String(msg.outfitColor || '#d97706');

        leaveCurrentRoom();

        let targetRoom: CoOpRoom | undefined;
        if (type === 'create_room') {
          const code = generateRoomCode();
          const roomName = String(msg.roomName || `${playerName}'s Kathmandu Session`).trim().slice(0, 36);
          const maxPlayers = Math.min(8, Math.max(2, Number(msg.maxPlayers || 4)));
          targetRoom = {
            code,
            name: roomName,
            isPublic: msg.isPublic !== false,
            maxPlayers,
            hostId: playerId,
            weather: String(msg.weather || 'sunny'),
            timeOfDay: Number(msg.timeOfDay ?? 10.5),
            activeMissionId: null,
            clients: new Map(),
            states: new Map(),
            createdAt: Date.now(),
          };
          rooms.set(code, targetRoom);
        } else if (type === 'join_room') {
          const code = String(msg.code || '').toUpperCase().trim();
          targetRoom = rooms.get(code);
          if (!targetRoom) {
            sendJson(ws, { type: 'error', code: 'INVALID_CODE', message: `No active room found for code "${code}".` });
            return;
          }
          if (targetRoom.clients.size >= targetRoom.maxPlayers) {
            sendJson(ws, { type: 'error', code: 'ROOM_FULL', message: 'This co-op room is full.' });
            return;
          }
        } else {
          // quick_join
          for (const room of rooms.values()) {
            if (room.isPublic && room.clients.size < room.maxPlayers) {
              targetRoom = room;
              break;
            }
          }
          if (!targetRoom) {
            const code = generateRoomCode();
            targetRoom = {
              code,
              name: `${playerName}'s Public Valley`,
              isPublic: true,
              maxPlayers: 6,
              hostId: playerId,
              weather: 'sunny',
              timeOfDay: 10.5,
              activeMissionId: null,
              clients: new Map(),
              states: new Map(),
              createdAt: Date.now(),
            };
            rooms.set(code, targetRoom);
          }
        }

        const client: RoomClient = {
          ws,
          playerId,
          playerName,
          ip,
          lastChatAt: 0,
          lastRewardAt: 0,
          claimedMissions: new Set(),
          reportsReceived: 0,
        };

        const initialState: PlayerSyncState = {
          id: playerId,
          name: playerName,
          gender,
          outfitColor,
          customization: sanitizeCustomization(msg.customization),
          animState: VALID_ANIMS.has(String(msg.animState)) ? String(msg.animState) : 'idle',
          x: Number(msg.x || 0),
          y: Number(msg.y || 0),
          z: Number(msg.z || 0),
          rotY: Number(msg.rotY || 0),
          inVehicleId: null,
          vehicleType: null,
          vehicleColor: null,
          region: 'kathmandu',
          speed: 0,
          lastUpdated: Date.now(),
        };

        targetRoom.clients.set(playerId, client);
        targetRoom.states.set(playerId, initialState);
        currentRoom = targetRoom;
        currentPlayerId = playerId;

        sendJson(ws, {
          type: 'room_joined',
          playerId,
          room: getRoomSnapshot(targetRoom),
        });

        broadcastRoom(
          targetRoom,
          {
            type: 'player_joined',
            player: initialState,
          },
          playerId,
        );
        return;
      }

      if (!currentRoom || !currentPlayerId) {
        sendJson(ws, { type: 'error', code: 'NOT_IN_ROOM', message: 'Join a co-op room first.' });
        return;
      }

      const client = currentRoom.clients.get(currentPlayerId);
      if (!client) return;

      if (type === 'sync_state') {
        const existing = currentRoom.states.get(currentPlayerId);
        if (!existing) return;
        const next: PlayerSyncState = {
          ...existing,
          name: msg.customization && typeof (msg.customization as Record<string, unknown>).name === 'string'
            ? String((msg.customization as Record<string, unknown>).name).trim().slice(0, 20) || existing.name
            : existing.name,
          gender: msg.customization && (msg.customization as Record<string, unknown>).gender === 'female'
            ? 'female'
            : msg.customization && (msg.customization as Record<string, unknown>).gender === 'male'
              ? 'male'
              : existing.gender,
          outfitColor: msg.customization && typeof (msg.customization as Record<string, unknown>).outfitColor === 'string'
            ? String((msg.customization as Record<string, unknown>).outfitColor).slice(0, 16)
            : existing.outfitColor,
          customization: msg.customization ? sanitizeCustomization(msg.customization) : existing.customization,
          animState: VALID_ANIMS.has(String(msg.animState)) ? String(msg.animState) : existing.animState,
          x: Number(msg.x ?? existing.x),
          y: Number(msg.y ?? existing.y),
          z: Number(msg.z ?? existing.z),
          rotY: Number(msg.rotY ?? existing.rotY),
          inVehicleId: typeof msg.inVehicleId === 'string' ? msg.inVehicleId : null,
          vehicleType: typeof msg.vehicleType === 'string' ? msg.vehicleType : null,
          vehicleColor: typeof msg.vehicleColor === 'string' ? msg.vehicleColor : null,
          region: String(msg.region || existing.region),
          speed: Number(msg.speed || 0),
          lastUpdated: Date.now(),
        };
        currentRoom.states.set(currentPlayerId, next);
        broadcastRoom(currentRoom, { type: 'state_update', player: next }, currentPlayerId);
      } else if (type === 'host_world_sync') {
        if (currentRoom.hostId === currentPlayerId) {
          if (typeof msg.weather === 'string') currentRoom.weather = msg.weather;
          if (typeof msg.timeOfDay === 'number') currentRoom.timeOfDay = msg.timeOfDay;
          if (typeof msg.activeMissionId === 'string' || msg.activeMissionId === null) {
            currentRoom.activeMissionId = msg.activeMissionId as string | null;
          }
          broadcastRoom(
            currentRoom,
            {
              type: 'world_sync',
              weather: currentRoom.weather,
              timeOfDay: currentRoom.timeOfDay,
              activeMissionId: currentRoom.activeMissionId,
            },
            currentPlayerId,
          );
        }
      } else if (type === 'chat') {
        const now = Date.now();
        if (now - client.lastChatAt < 1000) {
          sendJson(ws, { type: 'error', code: 'RATE_LIMITED', message: 'Please wait a moment before sending another message.' });
          return;
        }
        client.lastChatAt = now;
        const rawText = String(msg.text || '');
        if (!rawText.trim()) return;
        const { clean, flagged } = sanitizeChat(rawText);
        broadcastRoom(currentRoom, {
          type: 'chat_message',
          id: `msg_${now}_${Math.random().toString(36).slice(2, 6)}`,
          playerId: currentPlayerId,
          playerName: client.playerName,
          text: clean,
          moderated: flagged,
          timestamp: now,
        });
      } else if (type === 'report_player') {
        const targetId = String(msg.targetId || '');
        const target = currentRoom.clients.get(targetId);
        if (target && targetId !== currentPlayerId) {
          target.reportsReceived += 1;
          sendJson(ws, {
            type: 'system_notice',
            message: `Report submitted for ${target.playerName}. Moderation rules applied.`,
          });
        }
      } else if (type === 'claim_mission_reward') {
        const missionId = String(msg.missionId || '');
        const now = Date.now();
        const rewardDef = VALID_MISSION_REWARDS[missionId];
        if (!rewardDef) {
          sendJson(ws, { type: 'error', code: 'INVALID_MISSION', message: 'Server rejected unknown mission reward.' });
          return;
        }
        if (now - client.lastRewardAt < 5000 || client.claimedMissions.has(missionId)) {
          sendJson(ws, { type: 'error', code: 'REWARD_REJECTED', message: 'Mission reward already validated in this session.' });
          return;
        }
        client.lastRewardAt = now;
        client.claimedMissions.add(missionId);
        sendJson(ws, {
          type: 'reward_validated',
          missionId,
          money: rewardDef.money,
          xp: rewardDef.xp,
        });
      } else if (type === 'leave_room') {
        leaveCurrentRoom();
      }
    });

    ws.on('close', leaveCurrentRoom);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AARYA CITY server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AARYA CITY server:', err);
  process.exit(1);
});
