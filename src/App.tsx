/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterModal } from './components/CharacterModal';
import { GameHUD } from './components/GameHUD';
import { GarageModal } from './components/GarageModal';
import { MapModal } from './components/MapModal';
import { MissionsModal } from './components/MissionsModal';
import {
  MultiplayerModal,
  type ActiveRoomInfo,
  type ChatMsg,
} from './components/MultiplayerModal';
import { PauseSettingsModal } from './components/PauseSettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { UnityProjectModal } from './components/UnityProjectModal';
import { gameAudio } from './game/audio';
import { AaryaCityEngine } from './game/engine';
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_PROGRESS,
  listSaveSlots,
  loadGameSlot,
  loadSettings,
  saveGameSlot,
  saveSettings,
} from './game/saveSystem';
import type {
  GameScreenMode,
  GameSettings,
  HudSnapshot,
  MissionDef,
  PlayerCustomization,
  PlayerProgress,
  SaveSlotData,
  VehicleSpec,
  WeaponId,
  WeatherType,
} from './game/types';

type ActiveModal =
  | 'none'
  | 'map'
  | 'garage'
  | 'missions'
  | 'character'
  | 'multiplayer'
  | 'settings'
  | 'unity';

const INITIAL_HUD: HudSnapshot = {
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  money: 2500,
  xp: 0,
  level: 1,
  wantedLevel: 0,
  wantedHeat: 0,
  region: 'kathmandu',
  regionLabel: 'Kathmandu Core',
  weather: 'sunny',
  timeOfDay: 10.5,
  fps: 60,
  weapon: 'fists',
  ammo: 0,
  maxAmmo: 0,
  inVehicle: false,
  vehicleName: '',
  vehicleCategory: null,
  speedKmh: 0,
  fuel: 100,
  vehicleHealth: 100,
  interactionPrompt: null,
  activeMission: null,
  dialogue: null,
  bannerMessage: null,
  playerX: 12,
  playerZ: 18,
  playerRotY: Math.PI,
  waypoint: null,
  blips: [],
  isMultiplayer: false,
  remotePlayerCount: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AaryaCityEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [screenMode, setScreenMode] = useState<GameScreenMode>('title');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [customization, setCustomization] = useState<PlayerCustomization>(() => ({
    ...DEFAULT_CUSTOMIZATION,
  }));
  const [progress, setProgress] = useState<PlayerProgress>(() => ({
    ...DEFAULT_PROGRESS,
  }));
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [saveSlots, setSaveSlots] = useState<Array<{ slotId: string; data: SaveSlotData | null }>>(
    () => listSaveSlots(),
  );

  // Multiplayer State
  const [wsConnected, setWsConnected] = useState(false);
  const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<ActiveRoomInfo | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const customRef = useRef(customization);
  customRef.current = customization;
  const roomRef = useRef(room);
  roomRef.current = room;
  const selfIdRef = useRef(selfPlayerId);
  selfIdRef.current = selfPlayerId;

  const refreshSlots = useCallback(() => {
    setSaveSlots(listSaveSlots());
  }, []);

  // Connect WebSocket for Online Multiplayer
  const ensureSocket = useCallback((): WebSocket | null => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/multiplayer`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setMpError(null);
      };

      ws.onclose = () => {
        setWsConnected(false);
        setRoom(null);
        setSelfPlayerId(null);
        engineRef.current?.syncRemotePlayers([], null);
      };

      ws.onerror = () => {
        setMpError('Unable to reach Co-op Server. Offline Single Player remains fully available.');
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data as string) as Record<string, unknown>;
        const type = String(msg.type || '');

        if (type === 'error') {
          setMpError(String(msg.message || 'Multiplayer error'));
        } else if (type === 'room_joined') {
          const pid = String(msg.playerId);
          const rm = msg.room as ActiveRoomInfo;
          setSelfPlayerId(pid);
          setRoom(rm);
          setMpError(null);
          engineRef.current?.syncRemotePlayers(rm.players, pid);
        } else if (type === 'player_joined') {
          const p = msg.player as ActiveRoomInfo['players'][number];
          setRoom((prev) => {
            if (!prev) return prev;
            const nextPlayers = [...prev.players.filter((x) => x.id !== p.id), p];
            engineRef.current?.syncRemotePlayers(nextPlayers, selfIdRef.current);
            return { ...prev, players: nextPlayers };
          });
        } else if (type === 'player_left') {
          const leftId = String(msg.playerId);
          const newHost = String(msg.hostId || '');
          setRoom((prev) => {
            if (!prev) return prev;
            const nextPlayers = prev.players.filter((x) => x.id !== leftId);
            engineRef.current?.syncRemotePlayers(nextPlayers, selfIdRef.current);
            return { ...prev, hostId: newHost || prev.hostId, players: nextPlayers };
          });
        } else if (type === 'state_update') {
          const p = msg.player as ActiveRoomInfo['players'][number];
          setRoom((prev) => {
            if (!prev) return prev;
            const nextPlayers = prev.players.map((x) => (x.id === p.id ? p : x));
            engineRef.current?.syncRemotePlayers(nextPlayers, selfIdRef.current);
            return { ...prev, players: nextPlayers };
          });
        } else if (type === 'chat_message') {
          setChatLog((prev) => [
            ...prev.slice(-39),
            {
              id: String(msg.id),
              playerId: String(msg.playerId),
              playerName: String(msg.playerName),
              text: String(msg.text),
              moderated: Boolean(msg.moderated),
            },
          ]);
        } else if (type === 'system_notice') {
          setMpError(String(msg.message));
        }
      };

      return ws;
    } catch {
      setMpError('WebSocket unavailable in offline mode.');
      return null;
    }
  }, []);

  // Mount isolated Three.js Engine once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new AaryaCityEngine(
      mountEl,
      customRef.current,
      progressRef.current,
      settings,
      {
        onHudUpdate: (snap) => setHud(snap),
        onProgressUpdate: (nextProg) => setProgress(nextProg),
        onMissionComplete: (mission: MissionDef) => {
          const state = engineRef.current?.getSaveSnapshotState();
          if (state) {
            saveGameSlot(
              'autosave',
              customRef.current,
              progressRef.current,
              state.playerPos,
              state.weather,
              state.timeOfDay,
            );
            refreshSlots();
          }
          if (wsRef.current?.readyState === WebSocket.OPEN && roomRef.current) {
            wsRef.current.send(
              JSON.stringify({ type: 'claim_mission_reward', missionId: mission.id }),
            );
          }
        },
        onScreenModeRequest: (mode) => {
          setScreenMode(mode);
          engineRef.current?.setScreenMode(mode);
          if (mode === 'paused') {
            setActiveModal('settings');
          } else {
            setActiveModal('none');
          }
        },
        onOpenGarage: () => {
          setScreenMode('paused');
          engineRef.current?.setScreenMode('paused');
          setActiveModal('garage');
        },
        onSyncOutgoing: (state) => {
          if (wsRef.current?.readyState === WebSocket.OPEN && roomRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'sync_state', ...state }));
          }
        },
      },
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
      wsRef.current?.close();
    };
  }, []);

  const enterGameplay = useCallback(() => {
    gameAudio.unlock();
    setScreenMode('playing');
    setActiveModal('none');
    engineRef.current?.setScreenMode('playing');
  }, []);

  const handleNewGame = useCallback(() => {
    const freshProgress: PlayerProgress = {
      ...DEFAULT_PROGRESS,
      ownedVehicles: [...DEFAULT_PROGRESS.ownedVehicles],
      vehicleColors: { ...DEFAULT_PROGRESS.vehicleColors },
      completedMissions: [],
      discoveredLandmarks: [],
      stats: { ...DEFAULT_PROGRESS.stats },
    };
    setProgress(freshProgress);
    engineRef.current?.updateProgress(freshProgress);
    engineRef.current?.loadFromSaveState({ x: 12, y: 0, z: 18, rotY: Math.PI }, 'sunny', 10.5);
    enterGameplay();
    engineRef.current?.startMission('m1_kathmandu_arrival');
  }, [enterGameplay]);

  const handleLoadSlot = useCallback(
    (slotId: string) => {
      const { data } = loadGameSlot(slotId);
      if (!data) return;
      setCustomization(data.customization);
      setProgress(data.progress);
      engineRef.current?.updateCustomization(data.customization);
      engineRef.current?.updateProgress(data.progress);
      engineRef.current?.loadFromSaveState(data.playerPos, data.weather, data.timeOfDay);
      enterGameplay();
    },
    [enterGameplay],
  );

  const handleSaveSlot = useCallback(
    (slotId: string) => {
      const state = engineRef.current?.getSaveSnapshotState();
      if (!state) return;
      saveGameSlot(
        slotId,
        customization,
        progress,
        state.playerPos,
        state.weather,
        state.timeOfDay,
      );
      refreshSlots();
    },
    [customization, progress, refreshSlots],
  );

  // Global keyboard shortcuts (Enter on title, M Map, J Missions, G Garage)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (screenMode === 'title' && activeModal === 'none' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        const auto = saveSlots.find((s) => s.data !== null)?.data;
        if (auto) {
          handleLoadSlot(auto.slotId);
        } else {
          handleNewGame();
        }
        return;
      }

      if (screenMode === 'playing' && activeModal === 'none') {
        if (e.code === 'KeyM') {
          setScreenMode('paused');
          engineRef.current?.setScreenMode('paused');
          setActiveModal('map');
        } else if (e.code === 'KeyJ') {
          setScreenMode('paused');
          engineRef.current?.setScreenMode('paused');
          setActiveModal('missions');
        } else if (e.code === 'KeyG') {
          setScreenMode('paused');
          engineRef.current?.setScreenMode('paused');
          setActiveModal('garage');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenMode, activeModal, saveSlots, handleLoadSlot, handleNewGame]);

  const closeModal = () => {
    setActiveModal('none');
    if (screenMode === 'paused') {
      setScreenMode('playing');
      engineRef.current?.setScreenMode('playing');
    }
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.applySettings(next);
  };

  const handleUpdateCustomization = (next: PlayerCustomization) => {
    setCustomization(next);
    engineRef.current?.updateCustomization(next);
  };

  const handleBuyVehicle = (spec: VehicleSpec) => {
    if (progress.money < spec.price || progress.ownedVehicles.includes(spec.id)) return;
    const next: PlayerProgress = {
      ...progress,
      money: progress.money - spec.price,
      ownedVehicles: [...progress.ownedVehicles, spec.id],
      vehicleColors: { ...progress.vehicleColors, [spec.id]: spec.defaultColor },
    };
    setProgress(next);
    engineRef.current?.updateProgress(next);
    gameAudio.playRewardChime();
  };

  const handleChangeVehicleColor = (specId: string, colorHex: string) => {
    const next: PlayerProgress = {
      ...progress,
      vehicleColors: { ...progress.vehicleColors, [specId]: colorHex },
    };
    setProgress(next);
    engineRef.current?.updateProgress(next);
  };

  const latestSave = saveSlots.find((s) => s.data !== null)?.data || null;

  // Multiplayer send helpers
  const sendMp = (payload: Record<string, unknown>) => {
    const ws = ensureSocket();
    if (!ws) return;
    const transmit = () => ws.send(JSON.stringify({ version: '1.0.0', ...payload }));
    if (ws.readyState === WebSocket.OPEN) {
      transmit();
    } else {
      ws.addEventListener('open', transmit, { once: true });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0e14]">
      {/* Isolated WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Title Screen */}
      {screenMode === 'title' && activeModal === 'none' ? (
        <TitleScreen
          hasSave={Boolean(latestSave)}
          latestSave={latestSave}
          onNewGame={handleNewGame}
          onContinue={() => latestSave && handleLoadSlot(latestSave.slotId)}
          onOpenMissions={() => setActiveModal('missions')}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenCharacter={() => setActiveModal('character')}
          onOpenMultiplayer={() => {
            ensureSocket();
            setActiveModal('multiplayer');
          }}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenUnitySource={() => setActiveModal('unity')}
        />
      ) : null}

      {/* Active Gameplay HUD */}
      {screenMode === 'playing' && activeModal === 'none' ? (
        <GameHUD
          hud={hud}
          touchControls={settings.touchControls}
          muted={settings.audio.muted}
          onToggleMute={() =>
            handleUpdateSettings({
              ...settings,
              audio: { ...settings.audio, muted: !settings.audio.muted },
            })
          }
          onOpenPause={() => {
            setScreenMode('paused');
            engineRef.current?.setScreenMode('paused');
            setActiveModal('settings');
          }}
          onOpenMap={() => {
            setScreenMode('paused');
            engineRef.current?.setScreenMode('paused');
            setActiveModal('map');
          }}
          onOpenMissions={() => {
            setScreenMode('paused');
            engineRef.current?.setScreenMode('paused');
            setActiveModal('missions');
          }}
          onOpenGarage={() => {
            setScreenMode('paused');
            engineRef.current?.setScreenMode('paused');
            setActiveModal('garage');
          }}
          onSelectWeapon={(w: WeaponId) => engineRef.current?.selectWeapon(w)}
          onVirtualInput={(mx, my, sp, br) => engineRef.current?.setVirtualInput(mx, my, sp, br)}
          onTriggerAction={(act) => engineRef.current?.triggerAction(act)}
        />
      ) : null}

      {/* Modals */}
      {activeModal === 'map' ? (
        <MapModal
          playerX={hud.playerX}
          playerZ={hud.playerZ}
          discoveredLandmarks={progress.discoveredLandmarks}
          onSetWaypoint={(x, z, label) => engineRef.current?.setWaypoint(x, z, label)}
          onFastTravel={(x, z, label) => engineRef.current?.fastTravel(x, z, label)}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === 'garage' ? (
        <GarageModal
          progress={progress}
          onBuyVehicle={handleBuyVehicle}
          onSpawnVehicle={(id, col) => {
            engineRef.current?.spawnGarageVehicle(id, col);
            if (screenMode === 'title') enterGameplay();
          }}
          onChangeColor={handleChangeVehicleColor}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === 'missions' ? (
        <MissionsModal
          progress={progress}
          activeMissionId={hud.activeMission?.id || null}
          onStartMission={(id) => {
            enterGameplay();
            engineRef.current?.startMission(id);
          }}
          onAbortMission={() => engineRef.current?.abortMission()}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === 'character' ? (
        <CharacterModal
          customization={customization}
          progress={progress}
          onUpdate={handleUpdateCustomization}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === 'multiplayer' ? (
        <MultiplayerModal
          connected={wsConnected}
          selfPlayerId={selfPlayerId}
          room={room}
          errorText={mpError}
          chatLog={chatLog}
          onCreateRoom={(roomName, maxPlayers, isPublic) =>
            sendMp({
              type: 'create_room',
              roomName,
              maxPlayers,
              isPublic,
              playerName: customization.name,
              gender: customization.gender,
              outfitColor: customization.outfitColor,
              customization,
              x: hud.playerX,
              z: hud.playerZ,
            })
          }
          onJoinCode={(code) =>
            sendMp({
              type: 'join_room',
              code,
              playerName: customization.name,
              gender: customization.gender,
              outfitColor: customization.outfitColor,
              customization,
              x: hud.playerX,
              z: hud.playerZ,
            })
          }
          onQuickJoin={() =>
            sendMp({
              type: 'quick_join',
              playerName: customization.name,
              gender: customization.gender,
              outfitColor: customization.outfitColor,
              customization,
              x: hud.playerX,
              z: hud.playerZ,
            })
          }
          onLeaveRoom={() => {
            sendMp({ type: 'leave_room' });
            setRoom(null);
            setSelfPlayerId(null);
            engineRef.current?.syncRemotePlayers([], null);
          }}
          onSendChat={(text) => sendMp({ type: 'chat', text })}
          onReportPlayer={(targetId) => sendMp({ type: 'report_player', targetId })}
          onStartCoOpPlay={enterGameplay}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === 'settings' ? (
        <PauseSettingsModal
          isPlaying={screenMode === 'paused'}
          settings={settings}
          weather={hud.weather}
          timeOfDay={hud.timeOfDay}
          fps={hud.fps}
          saveSlots={saveSlots}
          onResume={closeModal}
          onUpdateSettings={handleUpdateSettings}
          onSetWeather={(w: WeatherType) => engineRef.current?.setWeather(w)}
          onSetTimeOfDay={(h) => engineRef.current?.setTimeOfDay(h)}
          onSaveSlot={handleSaveSlot}
          onLoadSlot={handleLoadSlot}
          onReturnToTitle={() => {
            setActiveModal('none');
            setScreenMode('title');
            engineRef.current?.setScreenMode('title');
          }}
          onClose={closeModal}
        />
      ) : null}

      {activeModal === 'unity' ? (
        <UnityProjectModal onClose={closeModal} />
      ) : null}
    </div>
  );
}
