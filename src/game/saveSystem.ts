import type {
  GameSettings,
  PlayerCustomization,
  PlayerProgress,
  SaveSlotData,
  WeatherType,
} from './types';

const SAVE_VERSION = 1;
const SETTINGS_KEY = 'aarya_city_settings_v1';
const SAVE_PREFIX = 'aarya_city_slot_v1_';

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: 'high',
  targetFps: 60,
  trafficDensity: 'medium',
  touchControls:
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  cameraSensitivity: 1.0,
  audio: {
    muted: false,
    master: 0.75,
    music: 0.45,
    sfx: 0.8,
    engine: 0.65,
  },
};

export const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  name: 'Aarya',
  gender: 'male',
  outfitColor: '#d97706',
  hairColor: '#1e1b18',
  skinTone: '#d49a73',
  faceStyle: 'oval',
  hairStyle: 'short_taper',
  clothingStyle: 'urban_parka',
  shoeStyle: 'hiking_boots',
  accessory: 'backpack',
  heightScale: 1.0,
  buildScale: 1.0,
};

export const DEFAULT_PROGRESS: PlayerProgress = {
  money: 2500,
  xp: 0,
  level: 1,
  ownedVehicles: ['kora_gt', 'thamel_scooter'],
  vehicleColors: {
    kora_gt: '#e11d48',
    thamel_scooter: '#0d9488',
  },
  completedMissions: [],
  discoveredLandmarks: [],
  stats: {
    distanceDrivenKm: 0,
    missionsCleared: 0,
    maxWantedSurvived: 0,
    vehiclesDriven: 0,
  },
};

function computeChecksum(payload: Omit<SaveSlotData, 'checksum'>): string {
  const str = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, audio: { ...DEFAULT_SETTINGS.audio } };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      audio: { ...DEFAULT_SETTINGS.audio, ...(parsed.audio || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, audio: { ...DEFAULT_SETTINGS.audio } };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function saveGameSlot(
  slotId: string,
  customization: PlayerCustomization,
  progress: PlayerProgress,
  playerPos: { x: number; y: number; z: number; rotY: number },
  weather: WeatherType,
  timeOfDay: number,
): SaveSlotData {
  const body: Omit<SaveSlotData, 'checksum'> = {
    version: SAVE_VERSION,
    slotId,
    savedAt: Date.now(),
    customization,
    progress,
    playerPos,
    weather,
    timeOfDay,
  };
  const data: SaveSlotData = {
    ...body,
    checksum: computeChecksum(body),
  };
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`${SAVE_PREFIX}${slotId}`, serialized);
    localStorage.setItem(`${SAVE_PREFIX}${slotId}_backup`, serialized);
  } catch {
    // Ignore storage errors
  }
  return data;
}

function tryParseAndVerify(raw: string | null): SaveSlotData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveSlotData;
    if (!parsed || typeof parsed.version !== 'number') return null;
    const { checksum, ...rest } = parsed;
    if (computeChecksum(rest) !== checksum) return null;
    parsed.customization = { ...DEFAULT_CUSTOMIZATION, ...(parsed.customization || {}) };
    return parsed;
  } catch {
    return null;
  }
}

export function loadGameSlot(slotId: string): {
  data: SaveSlotData | null;
  recoveredFromBackup: boolean;
} {
  const primary = tryParseAndVerify(localStorage.getItem(`${SAVE_PREFIX}${slotId}`));
  if (primary) return { data: primary, recoveredFromBackup: false };

  const backup = tryParseAndVerify(localStorage.getItem(`${SAVE_PREFIX}${slotId}_backup`));
  if (backup) {
    // Restore primary from backup
    try {
      localStorage.setItem(`${SAVE_PREFIX}${slotId}`, JSON.stringify(backup));
    } catch {
      // Ignore
    }
    return { data: backup, recoveredFromBackup: true };
  }

  return { data: null, recoveredFromBackup: false };
}

export function listSaveSlots(): Array<{ slotId: string; data: SaveSlotData | null }> {
  const ids = ['autosave', 'slot_1', 'slot_2', 'slot_3'];
  return ids.map((slotId) => ({
    slotId,
    data: loadGameSlot(slotId).data,
  }));
}

export function clearSaveSlot(slotId: string): void {
  localStorage.removeItem(`${SAVE_PREFIX}${slotId}`);
  localStorage.removeItem(`${SAVE_PREFIX}${slotId}_backup`);
}
