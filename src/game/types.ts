export type RegionId = 'kathmandu' | 'pokhara' | 'terai' | 'himalaya' | 'rural';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'heavy_rain'
  | 'fog'
  | 'thunderstorm'
  | 'snow';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';

export type VehicleCategory =
  | 'sports'
  | 'supercar'
  | 'sedan'
  | 'suv'
  | 'pickup'
  | 'motorcycle'
  | 'scooter'
  | 'bus'
  | 'truck'
  | 'jeep'
  | 'helicopter'
  | 'boat'
  | 'police';

export type WeaponId = 'fists' | 'khukuri' | 'pistol' | 'carbine';

export type GameScreenMode = 'title' | 'playing' | 'paused';

export interface VehicleSpec {
  id: string;
  name: string;
  category: VehicleCategory;
  price: number;
  maxSpeed: number; // m/s
  accel: number;
  turnSpeed: number;
  mass: number;
  grip: number;
  defaultColor: string;
  isAircraft?: boolean;
  isBoat?: boolean;
  length: number;
  width: number;
  height: number;
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  range: number;
  cooldown: number;
  clipSize: number;
  isMelee: boolean;
}

export interface LandmarkDef {
  id: string;
  name: string;
  region: RegionId;
  x: number;
  z: number;
  description: string;
  rewardXp: number;
  rewardMoney: number;
  kind: 'temple' | 'police' | 'hospital' | 'garage' | 'airport' | 'lake' | 'summit' | 'market';
}

export interface MissionCheckpoint {
  x: number;
  z: number;
  radius: number;
  label: string;
  dialogue?: { speaker: string; line: string };
  requireVehicle?: VehicleCategory | 'any';
  timeLimitSec?: number;
  enemiesCount?: number;
}

export interface MissionDef {
  id: string;
  chapter: number;
  title: string;
  type: 'story' | 'delivery' | 'chase' | 'race' | 'rescue' | 'explore';
  region: RegionId;
  briefing: string;
  rewardMoney: number;
  rewardXp: number;
  checkpoints: MissionCheckpoint[];
}

export type FaceStyle = 'oval' | 'angular' | 'broad';
export type HairStyle = 'short_taper' | 'layered_long' | 'top_knot' | 'slick_back' | 'braid';
export type ClothingStyle =
  | 'urban_parka'
  | 'nepali_daura'
  | 'kathmandu_street'
  | 'trekking_vest'
  | 'formal_blazer';
export type ShoeStyle = 'sneakers' | 'hiking_boots' | 'dress_shoes';
export type AccessoryType = 'none' | 'sunglasses' | 'dhaka_topi' | 'scarf' | 'backpack';

export type CharacterRole =
  | 'player'
  | 'civilian'
  | 'police'
  | 'security'
  | 'shopkeeper'
  | 'driver'
  | 'passenger'
  | 'story'
  | 'enemy'
  | 'remote';

export type CharacterAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'jump'
  | 'fall'
  | 'crouch'
  | 'swim'
  | 'climb'
  | 'drive'
  | 'enter_vehicle'
  | 'exit_vehicle'
  | 'combat'
  | 'interact'
  | 'talk'
  | 'sit';

export interface PlayerCustomization {
  name: string;
  gender: 'male' | 'female';
  outfitColor: string;
  hairColor: string;
  skinTone: string;
  faceStyle: FaceStyle;
  hairStyle: HairStyle;
  clothingStyle: ClothingStyle;
  shoeStyle: ShoeStyle;
  accessory: AccessoryType;
  heightScale: number;
  buildScale: number;
}

export interface AudioSettings {
  muted: boolean;
  master: number;
  music: number;
  sfx: number;
  engine: number;
}

export interface GameSettings {
  graphics: GraphicsPreset;
  targetFps: 30 | 60;
  trafficDensity: 'low' | 'medium' | 'high';
  touchControls: boolean;
  cameraSensitivity: number;
  audio: AudioSettings;
}

export interface PlayerProgress {
  money: number;
  xp: number;
  level: number;
  ownedVehicles: string[];
  vehicleColors: Record<string, string>;
  completedMissions: string[];
  discoveredLandmarks: string[];
  stats: {
    distanceDrivenKm: number;
    missionsCleared: number;
    maxWantedSurvived: number;
    vehiclesDriven: number;
  };
}

export interface SaveSlotData {
  version: number;
  slotId: string;
  savedAt: number;
  checksum: string;
  customization: PlayerCustomization;
  progress: PlayerProgress;
  playerPos: { x: number; y: number; z: number; rotY: number };
  weather: WeatherType;
  timeOfDay: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  type: 'vehicle' | 'police' | 'objective' | 'landmark' | 'remote';
  color?: string;
}

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  money: number;
  xp: number;
  level: number;
  wantedLevel: number;
  wantedHeat: number;
  region: RegionId;
  regionLabel: string;
  weather: WeatherType;
  timeOfDay: number;
  fps: number;
  weapon: WeaponId;
  ammo: number;
  maxAmmo: number;
  inVehicle: boolean;
  vehicleName: string;
  vehicleCategory: VehicleCategory | null;
  speedKmh: number;
  fuel: number;
  vehicleHealth: number;
  interactionPrompt: string | null;
  activeMission: {
    id: string;
    title: string;
    objective: string;
    stepIndex: number;
    totalSteps: number;
    timeLeftSec: number | null;
    distanceM: number;
  } | null;
  dialogue: { speaker: string; line: string } | null;
  bannerMessage: string | null;
  playerX: number;
  playerZ: number;
  playerRotY: number;
  waypoint: { x: number; z: number; label: string } | null;
  blips: MinimapBlip[];
  isMultiplayer: boolean;
  remotePlayerCount: number;
}

export interface RemotePlayerData {
  id: string;
  name: string;
  gender: 'male' | 'female';
  outfitColor: string;
  customization?: Partial<PlayerCustomization>;
  animState?: CharacterAnimState;
  x: number;
  y: number;
  z: number;
  rotY: number;
  inVehicleId: string | null;
  vehicleType: string | null;
  vehicleColor: string | null;
  region: string;
  speed: number;
}

export const VEHICLE_CATALOG: VehicleSpec[] = [
  {
    id: 'kora_gt',
    name: 'Kora GT Coupe',
    category: 'sports',
    price: 0,
    maxSpeed: 38,
    accel: 22,
    turnSpeed: 2.6,
    mass: 1350,
    grip: 0.94,
    defaultColor: '#e11d48',
    length: 4.3,
    width: 1.9,
    height: 1.32,
  },
  {
    id: 'everest_apex',
    name: 'Everest Apex V10',
    category: 'supercar',
    price: 18000,
    maxSpeed: 48,
    accel: 29,
    turnSpeed: 2.8,
    mass: 1280,
    grip: 0.97,
    defaultColor: '#f59e0b',
    length: 4.5,
    width: 2.0,
    height: 1.18,
  },
  {
    id: 'patan_sedan',
    name: 'Patan Executive',
    category: 'sedan',
    price: 4500,
    maxSpeed: 31,
    accel: 16,
    turnSpeed: 2.3,
    mass: 1550,
    grip: 0.9,
    defaultColor: '#334155',
    length: 4.5,
    width: 1.85,
    height: 1.45,
  },
  {
    id: 'mustang_jeep',
    name: 'Mustang Trail 4x4',
    category: 'jeep',
    price: 7500,
    maxSpeed: 30,
    accel: 18,
    turnSpeed: 2.1,
    mass: 2100,
    grip: 0.96,
    defaultColor: '#15803d',
    length: 4.4,
    width: 1.95,
    height: 1.88,
  },
  {
    id: 'gorkha_suv',
    name: 'Gorkha Armored SUV',
    category: 'suv',
    price: 11000,
    maxSpeed: 32,
    accel: 17,
    turnSpeed: 2.0,
    mass: 2350,
    grip: 0.92,
    defaultColor: '#1e293b',
    length: 4.8,
    width: 2.05,
    height: 1.9,
  },
  {
    id: 'terai_pickup',
    name: 'Terai Hauler Pickup',
    category: 'pickup',
    price: 6000,
    maxSpeed: 29,
    accel: 16,
    turnSpeed: 2.1,
    mass: 2050,
    grip: 0.91,
    defaultColor: '#0284c7',
    length: 4.9,
    width: 1.98,
    height: 1.78,
  },
  {
    id: 'yak_moto',
    name: 'Yak Streetfighter',
    category: 'motorcycle',
    price: 3200,
    maxSpeed: 40,
    accel: 27,
    turnSpeed: 3.3,
    mass: 210,
    grip: 0.93,
    defaultColor: '#dc2626',
    length: 2.1,
    width: 0.78,
    height: 1.12,
  },
  {
    id: 'thamel_scooter',
    name: 'Thamel City Scooter',
    category: 'scooter',
    price: 1200,
    maxSpeed: 24,
    accel: 16,
    turnSpeed: 3.6,
    mass: 125,
    grip: 0.92,
    defaultColor: '#0d9488',
    length: 1.85,
    width: 0.72,
    height: 1.1,
  },
  {
    id: 'sajha_bus',
    name: 'Valley Transit Bus',
    category: 'bus',
    price: 9000,
    maxSpeed: 23,
    accel: 9.5,
    turnSpeed: 1.45,
    mass: 8500,
    grip: 0.88,
    defaultColor: '#16a34a',
    length: 8.6,
    width: 2.4,
    height: 2.9,
  },
  {
    id: 'birgunj_truck',
    name: 'Birgunj Cargo Rig',
    category: 'truck',
    price: 12500,
    maxSpeed: 24,
    accel: 10,
    turnSpeed: 1.4,
    mass: 9500,
    grip: 0.87,
    defaultColor: '#b45309',
    length: 7.8,
    width: 2.45,
    height: 3.1,
  },
  {
    id: 'himal_heli',
    name: 'Himalayan Rescue Heli',
    category: 'helicopter',
    price: 35000,
    maxSpeed: 44,
    accel: 20,
    turnSpeed: 2.2,
    mass: 2600,
    grip: 0.98,
    defaultColor: '#ea580c',
    isAircraft: true,
    length: 6.8,
    width: 2.3,
    height: 2.8,
  },
  {
    id: 'phewa_boat',
    name: 'Phewa Jet Boat',
    category: 'boat',
    price: 8000,
    maxSpeed: 34,
    accel: 18,
    turnSpeed: 2.5,
    mass: 1200,
    grip: 0.86,
    defaultColor: '#f8fafc',
    isBoat: true,
    length: 5.2,
    width: 2.1,
    height: 1.25,
  },
  {
    id: 'aarya_police',
    name: 'Aarya Police Interceptor',
    category: 'police',
    price: 999999,
    maxSpeed: 41,
    accel: 25,
    turnSpeed: 2.7,
    mass: 1650,
    grip: 0.95,
    defaultColor: '#0f172a',
    length: 4.5,
    width: 1.92,
    height: 1.48,
  },
];

export const WEAPON_CATALOG: Record<WeaponId, WeaponSpec> = {
  fists: {
    id: 'fists',
    name: 'Unarmed Strike',
    damage: 20,
    range: 2.6,
    cooldown: 0.42,
    clipSize: 0,
    isMelee: true,
  },
  khukuri: {
    id: 'khukuri',
    name: 'Ceremonial Khukuri',
    damage: 45,
    range: 3.1,
    cooldown: 0.5,
    clipSize: 0,
    isMelee: true,
  },
  pistol: {
    id: 'pistol',
    name: 'Gorkha 9mm',
    damage: 34,
    range: 55,
    cooldown: 0.28,
    clipSize: 12,
    isMelee: false,
  },
  carbine: {
    id: 'carbine',
    name: 'Himal Tactical Carbine',
    damage: 28,
    range: 75,
    cooldown: 0.13,
    clipSize: 30,
    isMelee: false,
  },
};

export const LANDMARKS: LandmarkDef[] = [
  {
    id: 'lm_durbar',
    name: 'Aarya Durbar Pagoda',
    region: 'kathmandu',
    x: 0,
    z: 0,
    description: 'Ancient Newari multi-tiered brick & carved timber temple plaza in central Kathmandu.',
    rewardXp: 120,
    rewardMoney: 500,
    kind: 'temple',
  },
  {
    id: 'lm_police_hq',
    name: 'Kathmandu Metro Police HQ',
    region: 'kathmandu',
    x: 56,
    z: -42,
    description: 'Central dispatch and interceptor depot.',
    rewardXp: 80,
    rewardMoney: 300,
    kind: 'police',
  },
  {
    id: 'lm_garage',
    name: 'Thamel Customs & Garage',
    region: 'kathmandu',
    x: -54,
    z: 42,
    description: 'Full-service tuning bay, paint shop, and vehicle storage.',
    rewardXp: 80,
    rewardMoney: 300,
    kind: 'garage',
  },
  {
    id: 'lm_hospital',
    name: 'Bir Valley Teaching Hospital',
    region: 'kathmandu',
    x: 58,
    z: 48,
    description: 'Emergency trauma care and medical supply dispatch.',
    rewardXp: 80,
    rewardMoney: 300,
    kind: 'hospital',
  },
  {
    id: 'lm_airport',
    name: 'Tribhuvan Skyport Runway',
    region: 'kathmandu',
    x: 138,
    z: 10,
    description: 'Regional airstrip and Himalayan rescue helipad.',
    rewardXp: 150,
    rewardMoney: 750,
    kind: 'airport',
  },
  {
    id: 'lm_pokhara_lake',
    name: 'Phewa Mirror Lake & Dock',
    region: 'pokhara',
    x: -175,
    z: -35,
    description: 'Glacial valley lake framed by tourist promenades and boat launches.',
    rewardXp: 150,
    rewardMoney: 750,
    kind: 'lake',
  },
  {
    id: 'lm_terai_terminal',
    name: 'Terai Ring Bus Terminal',
    region: 'terai',
    x: 0,
    z: 175,
    description: 'Bustling flatland cargo hub and southern agricultural bazaar.',
    rewardXp: 140,
    rewardMoney: 650,
    kind: 'market',
  },
  {
    id: 'lm_himalaya_pass',
    name: 'Annapurna Ridge Base Camp',
    region: 'himalaya',
    x: -10,
    z: -215,
    description: 'High-altitude snowline outpost overlooking the valley via switchback road.',
    rewardXp: 250,
    rewardMoney: 1200,
    kind: 'summit',
  },
];

export const REGION_LABELS: Record<RegionId, string> = {
  kathmandu: 'Kathmandu Core',
  pokhara: 'Pokhara Lakeside',
  terai: 'Terai Highway',
  himalaya: 'Himalayan Ridge',
  rural: 'Rural Valley',
};
