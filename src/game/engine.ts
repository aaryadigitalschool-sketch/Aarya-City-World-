import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gameAudio } from './audio';
import { STORY_MISSIONS } from './missions';
import {
  createCharacterRig,
  createVehicleRig,
  type CharacterRig,
  type VehicleRig,
} from './models';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import { DEFAULT_CUSTOMIZATION } from './saveSystem';
import {
  LANDMARKS,
  REGION_LABELS,
  VEHICLE_CATALOG,
  WEAPON_CATALOG,
  type AccessoryType,
  type CharacterAnimState,
  type CharacterRole,
  type ClothingStyle,
  type FaceStyle,
  type GameScreenMode,
  type GameSettings,
  type HairStyle,
  type HudSnapshot,
  type MinimapBlip,
  type MissionDef,
  type PlayerCustomization,
  type PlayerProgress,
  type RemotePlayerData,
  type ShoeStyle,
  type VehicleSpec,
  type WeaponId,
  type WeatherType,
} from './types';
import {
  buildAaryaWorld,
  getRegionAt,
  groundHeightAt,
  WATER_LEVEL,
  WORLD_RADIUS,
  type WorldHandles,
} from './world';

const _vec3 = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _vec3c = new THREE.Vector3();

interface WorldVehicle {
  id: string;
  spec: VehicleSpec;
  rig: VehicleRig;
  driverRig?: CharacterRig;
  passengerRig?: CharacterRig;
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  steerAngle: number;
  fuel: number;
  health: number;
  isPolice: boolean;
  aiState: 'parked' | 'traffic' | 'pursuit';
  aiWaypointIdx: number;
  rollAngle: number;
  pitchAngle: number;
}

interface WorldNpc {
  id: string;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  health: number;
  kind: 'civilian' | 'police' | 'security' | 'shopkeeper' | 'story' | 'enemy';
  name?: string;
  dialogue?: string;
  sitting?: boolean;
  interactTimer?: number;
  lodLevel?: 0 | 1;
  frameOffset: number;
  fleeTimer: number;
  hitFlashTimer: number;
  wanderAngle: number;
  wanderTimer: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  damage: number;
  fromPlayer: boolean;
}

interface ParticleBurst {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onProgressUpdate: (progress: PlayerProgress) => void;
  onMissionComplete: (mission: MissionDef) => void;
  onScreenModeRequest: (mode: GameScreenMode) => void;
  onOpenGarage: () => void;
  onSyncOutgoing: (state: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    inVehicleId: string | null;
    vehicleType: string | null;
    vehicleColor: string | null;
    region: string;
    speed: number;
    animState: CharacterAnimState;
    customization: PlayerCustomization;
  }) => void;
}

export class AaryaCityEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private world: WorldHandles;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyColor = new THREE.Color('#87ceeb');
  private nightColor = new THREE.Color('#0b1020');

  private playerRig: CharacterRig;
  private playerX = 12;
  private playerY = 0;
  private playerZ = 18;
  private playerVy = 0;
  private playerRotY = Math.PI;
  private playerSpeed = 0;
  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private isCrouching = false;

  private currentWeapon: WeaponId = 'fists';
  private ammoMap: Record<WeaponId, number> = {
    fists: 0,
    khukuri: 0,
    pistol: 12,
    carbine: 30,
  };
  private attackCooldown = 0;
  private attackAnimTimer = 0;

  private vehicles: WorldVehicle[] = [];
  private currentVehicle: WorldVehicle | null = null;
  private npcs: WorldNpc[] = [];
  private projectiles: Projectile[] = [];
  private particles: ParticleBurst[] = [];
  private policeHeli: WorldVehicle | null = null;

  private wantedHeat = 0; // 0..100 -> 0..5 stars
  private wantedLevel = 0;

  private weather: WeatherType = 'sunny';
  private timeOfDay = 10.5; // 0..24 hours
  private lightningFlash = 0;
  private thunderCooldown = 8;

  private rainPoints: THREE.Points;
  private rainGeo: THREE.BufferGeometry;

  private missionMarker: THREE.Group;
  private activeMission: MissionDef | null = null;
  private missionStepIdx = 0;
  private missionTimeLeft: number | null = null;
  private dialogueTimer = 0;
  private currentDialogue: { speaker: string; line: string } | null = null;
  private bannerTimer = 0;
  private currentBanner: string | null = null;
  private waypoint: { x: number; z: number; label: string } | null = null;

  private customization: PlayerCustomization;
  private progress: PlayerProgress;
  private settings: GameSettings;
  private screenMode: GameScreenMode = 'title';

  // Camera state
  private camYaw = 0;
  private camPitch = 0.28;
  private camDist = 7.2;
  private camPos = new THREE.Vector3(12, 6, 26);
  private camLook = new THREE.Vector3(12, 1.5, 18);
  private camShake = 0;
  private isDraggingCam = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Input state
  private keys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualSprint = false;
  private virtualBrake = false;
  private hitstopTimer = 0;

  // Remote Multiplayer actors
  private remoteRigs = new Map<
    string,
    {
      rig: CharacterRig;
      customSig: string;
      vehicleRig?: VehicleRig;
      vehicleType?: string | null;
      animState: CharacterAnimState;
      speed: number;
      targetX: number;
      targetY: number;
      targetZ: number;
      targetRotY: number;
      x: number;
      y: number;
      z: number;
      rotY: number;
    }
  >();
  private isMultiplayer = false;
  private lastSyncSentAt = 0;

  // Loop & performance tracking
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private simFrameCount = 0;
  private fpsSamples = 60;
  private lastHudPush = 0;
  private titleOrbitAngle = 0;
  private trafficPhaseTimer = 0;
  private trafficGreenAxis: 'x' | 'z' = 'x';
  private contextLost = false;

  constructor(
    container: HTMLElement,
    customization: PlayerCustomization,
    progress: PlayerProgress,
    settings: GameSettings,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.customization = { ...customization };
    this.progress = { ...progress };
    this.settings = { ...settings };
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#87ceeb');
    this.scene.fog = new THREE.FogExp2('#9ecae6', 0.0032);

    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      650,
    );

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-point atmospheric rig
    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#57534e', 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff4d6', 1.65);
    this.sunLight.position.set(70, 110, 50);
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 260;
    const d = 85;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.world = buildAaryaWorld(this.scene, this.textures, this.isSoftwareGl);

    // Player character
    this.playerRig = createCharacterRig(this.customization, this.textures.contactShadow);
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.playerRig.group);

    // Rain / Snow Particle System
    const rainCount = 900;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 90;
      rainPositions[i * 3 + 1] = Math.random() * 35;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainPoints = new THREE.Points(
      this.rainGeo,
      new THREE.PointsMaterial({
        color: '#cbd5e1',
        size: 0.22,
        transparent: true,
        opacity: 0.65,
      }),
    );
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // Mission Beacon Marker
    this.missionMarker = new THREE.Group();
    const mRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.22, 10, 32),
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#06b6d4',
        emissiveIntensity: 1.5,
      }),
    );
    mRing.rotation.x = Math.PI / 2;
    mRing.position.y = 0.25;
    const mBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 1.1, 32, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mBeam.position.y = 16;
    this.missionMarker.add(mRing, mBeam);
    this.missionMarker.visible = false;
    this.scene.add(this.missionMarker);

    this.spawnInitialWorldEntities();
    this.applySettings(this.settings);
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  private attachVehicleOccupants(veh: WorldVehicle, includePassenger = false): void {
    const driverRole: CharacterRole = veh.isPolice ? 'police' : 'driver';
    if (!veh.driverRig) {
      const driverRig = createCharacterRig(
        {
          ...DEFAULT_CUSTOMIZATION,
          name: veh.isPolice ? 'Officer Rai' : 'Valley Driver',
          gender: Math.random() > 0.35 ? 'male' : 'female',
          outfitColor: veh.isPolice ? '#1e3a8a' : '#334155',
          clothingStyle: veh.isPolice ? 'formal_blazer' : 'kathmandu_street',
          accessory: veh.isPolice ? 'none' : 'sunglasses',
        },
        this.textures.contactShadow,
        driverRole,
      );
      driverRig.contactShadow.visible = false;
      driverRig.group.position.set(0, 0, 0);
      driverRig.group.rotation.set(0, 0, 0);
      driverRig.animate(0.1, 0, true, false, false, 0, 'drive');
      veh.rig.driverMount.add(driverRig.group);
      veh.driverRig = driverRig;
    }

    if (
      includePassenger &&
      !veh.passengerRig &&
      veh.spec.category !== 'motorcycle' &&
      veh.spec.category !== 'scooter'
    ) {
      const paxRig = createCharacterRig(
        {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Passenger',
          gender: Math.random() > 0.5 ? 'female' : 'male',
          outfitColor: veh.isPolice ? '#1e3a8a' : '#0f766e',
          clothingStyle: veh.isPolice ? 'formal_blazer' : 'trekking_vest',
          hairStyle: 'layered_long',
          accessory: 'none',
        },
        this.textures.contactShadow,
        veh.isPolice ? 'police' : 'passenger',
      );
      paxRig.contactShadow.visible = false;
      paxRig.group.position.set(0, 0, 0);
      paxRig.group.rotation.set(0, 0, 0);
      paxRig.animate(0.1, 0, true, false, false, 0, 'sit');
      veh.rig.passengerMount.add(paxRig.group);
      veh.passengerRig = paxRig;
    }
  }

  private spawnInitialWorldEntities(): void {
    const spawnVehicle = (
      specId: string,
      x: number,
      z: number,
      rotY: number,
      aiState: 'parked' | 'traffic' | 'pursuit' = 'parked',
      colorOverride?: string,
    ): WorldVehicle | null => {
      const spec = VEHICLE_CATALOG.find((v) => v.id === specId);
      if (!spec) return null;
      const color = colorOverride || this.progress.vehicleColors[specId] || spec.defaultColor;
      const rig = createVehicleRig(spec, color, this.textures.contactShadow, this.isSoftwareGl);
      const y = spec.isBoat ? WATER_LEVEL : groundHeightAt(x, z);
      rig.group.position.set(x, y, z);
      rig.group.rotation.y = rotY;
      this.scene.add(rig.group);
      const veh: WorldVehicle = {
        id: `${specId}_${Math.random().toString(36).slice(2, 7)}`,
        spec,
        rig,
        x,
        y,
        z,
        rotY,
        speed: 0,
        steerAngle: 0,
        fuel: 100,
        health: 100,
        isPolice: spec.category === 'police',
        aiState,
        aiWaypointIdx: 0,
        rollAngle: 0,
        pitchAngle: 0,
      };
      if (aiState === 'traffic' || aiState === 'pursuit') {
        this.attachVehicleOccupants(veh, spec.category === 'bus' || veh.isPolice || Math.random() > 0.4);
      }
      this.vehicles.push(veh);
      return veh;
    };

    // Hero Starter & Regional Vehicles
    spawnVehicle('kora_gt', 16, 18, Math.PI * 0.5, 'parked');
    spawnVehicle('thamel_scooter', 8, 22, 0, 'parked');
    spawnVehicle('yak_moto', -46, 36, Math.PI * 0.5, 'parked');
    spawnVehicle('mustang_jeep', -10, -76, Math.PI, 'parked');
    spawnVehicle('everest_apex', -54, 34, 0, 'parked');
    spawnVehicle('himal_heli', 142, 22, -Math.PI * 0.5, 'parked');
    spawnVehicle('phewa_boat', -182, -35, -Math.PI * 0.5, 'parked');
    spawnVehicle('sajha_bus', -12, 168, Math.PI * 0.5, 'parked');
    spawnVehicle('terai_pickup', 18, 178, 0, 'parked');
    spawnVehicle('aarya_police', 52, -38, Math.PI * 0.5, 'parked');

    // Traffic AI cars cruising Kathmandu Ring Road with visible 3D Drivers & Passengers
    const trafficSpecs = ['patan_sedan', 'gorkha_suv', 'terai_pickup', 'kora_gt', 'sajha_bus', 'birgunj_truck'];
    const ringPoints = [
      { x: -64, z: -30, rot: 0, wp: 3 },
      { x: -30, z: 64, rot: Math.PI / 2, wp: 2 },
      { x: 64, z: 25, rot: Math.PI, wp: 1 },
      { x: 25, z: -64, rot: -Math.PI / 2, wp: 0 },
      { x: -64, z: 35, rot: 0, wp: 3 },
      { x: 64, z: -25, rot: Math.PI, wp: 1 },
    ];
    ringPoints.forEach((pt, idx) => {
      const v = spawnVehicle(trafficSpecs[idx % trafficSpecs.length], pt.x, pt.z, pt.rot, 'traffic');
      if (v) v.aiWaypointIdx = pt.wp;
    });

    // Helper for spawning sculpted 3D NPCs by role
    const spawnNpc = (opts: {
      id: string;
      x: number;
      z: number;
      rotY: number;
      kind: WorldNpc['kind'];
      custom: PlayerCustomization;
      sitting?: boolean;
      name?: string;
      dialogue?: string;
      speed?: number;
      health?: number;
    }) => {
      const ny = groundHeightAt(opts.x, opts.z);
      const role: CharacterRole = opts.kind;
      const rig = createCharacterRig(opts.custom, this.textures.contactShadow, role);
      rig.group.position.set(opts.x, ny, opts.z);
      rig.group.rotation.y = opts.rotY;
      if (opts.sitting) {
        rig.animate(0.1, 0, true, false, false, 0, 'sit');
      }
      this.scene.add(rig.group);
      this.npcs.push({
        id: opts.id,
        rig,
        x: opts.x,
        y: ny,
        z: opts.z,
        rotY: opts.rotY,
        speed: opts.speed ?? (opts.sitting ? 0 : 1.55),
        health: opts.health ?? 70,
        kind: opts.kind,
        name: opts.name,
        dialogue: opts.dialogue,
        sitting: opts.sitting,
        frameOffset: this.npcs.length % 3,
        fleeTimer: 0,
        hitFlashTimer: 0,
        wanderAngle: opts.rotY,
        wanderTimer: 2 + Math.random() * 4,
      });
    };

    // Named Story Characters across Nepal Regions
    const storyCast: Array<{
      id: string;
      name: string;
      x: number;
      z: number;
      rotY: number;
      dialogue: string;
      custom: PlayerCustomization;
    }> = [
      {
        id: 'story_maya',
        name: 'Maya Thapa',
        x: 7,
        z: 10,
        rotY: -0.6,
        dialogue: 'Welcome to Kathmandu, Aarya. Keep an eye on Durbar Plaza—our courier convoy needs backup along the ring road.',
        custom: {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Maya Thapa',
          gender: 'female',
          outfitColor: '#be123c',
          hairColor: '#1e1b18',
          skinTone: '#d49a73',
          faceStyle: 'oval',
          hairStyle: 'layered_long',
          clothingStyle: 'nepali_daura',
          shoeStyle: 'dress_shoes',
          accessory: 'scarf',
          heightScale: 0.99,
          buildScale: 0.96,
        },
      },
      {
        id: 'story_bikram',
        name: 'Bikram Shrestha',
        x: -49,
        z: 39,
        rotY: 0.9,
        dialogue: 'Thamel Customs is open 24/7. Bring any mountain 4x4 or street coupe here for custom paint and tuning.',
        custom: {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Bikram Shrestha',
          gender: 'male',
          outfitColor: '#0284c7',
          hairColor: '#1e1b18',
          skinTone: '#b87a52',
          faceStyle: 'angular',
          hairStyle: 'short_taper',
          clothingStyle: 'trekking_vest',
          shoeStyle: 'hiking_boots',
          accessory: 'sunglasses',
          heightScale: 1.03,
          buildScale: 1.06,
        },
      },
      {
        id: 'story_sita',
        name: 'Dr. Sita Gurung',
        x: 54,
        z: 45,
        rotY: -1.2,
        dialogue: 'Bir Valley Trauma Unit stays stocked for highway emergencies. Step inside anytime you need full recovery.',
        custom: {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Dr. Sita Gurung',
          gender: 'female',
          outfitColor: '#f8fafc',
          hairColor: '#1e1b18',
          skinTone: '#d49a73',
          faceStyle: 'oval',
          hairStyle: 'braid',
          clothingStyle: 'formal_blazer',
          shoeStyle: 'dress_shoes',
          accessory: 'none',
          heightScale: 0.98,
          buildScale: 0.94,
        },
      },
      {
        id: 'story_tenzing',
        name: 'Tenzing Sherpa',
        x: -8,
        z: -210,
        rotY: 0.2,
        dialogue: 'You made it above the snowline! Watch the switchback grip in storms and keep your stamina steady on steep climbs.',
        custom: {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Tenzing Sherpa',
          gender: 'male',
          outfitColor: '#ea580c',
          hairColor: '#451a03',
          skinTone: '#b87a52',
          faceStyle: 'broad',
          hairStyle: 'top_knot',
          clothingStyle: 'urban_parka',
          shoeStyle: 'hiking_boots',
          accessory: 'dhaka_topi',
          heightScale: 1.02,
          buildScale: 1.05,
        },
      },
    ];
    for (const sc of storyCast) {
      spawnNpc({ ...sc, kind: 'story', speed: 0, health: 120 });
    }

    // Shopkeepers at Markets
    spawnNpc({
      id: 'shop_durbar',
      x: -14,
      z: 11,
      rotY: 0.7,
      kind: 'shopkeeper',
      name: 'Ram Prasad (Bazaar Merchant)',
      dialogue: 'Fresh spiced tea, Dhaka textiles, and trekking provisions straight from Patan & Palpa!',
      speed: 0,
      custom: {
        ...DEFAULT_CUSTOMIZATION,
        name: 'Ram Prasad',
        gender: 'male',
        outfitColor: '#a16207',
        clothingStyle: 'nepali_daura',
        accessory: 'dhaka_topi',
        faceStyle: 'broad',
        hairStyle: 'short_taper',
      },
    });
    spawnNpc({
      id: 'shop_terai',
      x: 6,
      z: 170,
      rotY: -0.8,
      kind: 'shopkeeper',
      name: 'Anita Yadav (Terai Trader)',
      dialogue: 'Terai Ring Market supplies fuel and fresh harvest cargo to every bus heading north.',
      speed: 0,
      custom: {
        ...DEFAULT_CUSTOMIZATION,
        name: 'Anita Yadav',
        gender: 'female',
        outfitColor: '#0f766e',
        clothingStyle: 'nepali_daura',
        hairStyle: 'braid',
        accessory: 'none',
      },
    });

    // Security Personnel at Skyport & Police HQ
    spawnNpc({
      id: 'sec_skyport',
      x: 132,
      z: 12,
      rotY: -1.4,
      kind: 'security',
      name: 'Skyport Security Officer',
      dialogue: 'Flight deck clearance active for Himalayan Rescue Helicopters.',
      speed: 0,
      custom: {
        ...DEFAULT_CUSTOMIZATION,
        name: 'Skyport Security',
        gender: 'male',
        outfitColor: '#334155',
        clothingStyle: 'trekking_vest',
        accessory: 'sunglasses',
        heightScale: 1.04,
        buildScale: 1.08,
      },
    });
    spawnNpc({
      id: 'sec_hq',
      x: 52,
      z: -38,
      rotY: 0.3,
      kind: 'police',
      name: 'Inspector KC',
      dialogue: 'Keep the ring road safe. Unresolved heat can always be settled at Metro HQ.',
      speed: 0,
      custom: {
        ...DEFAULT_CUSTOMIZATION,
        name: 'Inspector KC',
        gender: 'male',
        outfitColor: '#1e3a8a',
        clothingStyle: 'formal_blazer',
        heightScale: 1.04,
        buildScale: 1.05,
      },
    });

    // Seated Plaza & Lakeside NPCs
    const seatedSpots = [
      { x: -6, z: 16, rotY: 0.4, color: '#4338ca' },
      { x: -168, z: -32, rotY: -1.2, color: '#0284c7' },
      { x: 16, z: -12, rotY: 2.2, color: '#be123c' },
    ];
    seatedSpots.forEach((sp, idx) => {
      spawnNpc({
        id: `seated_${idx}`,
        x: sp.x,
        z: sp.z,
        rotY: sp.rotY,
        kind: 'civilian',
        sitting: true,
        speed: 0,
        custom: {
          ...DEFAULT_CUSTOMIZATION,
          name: `Local Resident ${idx + 1}`,
          gender: idx % 2 === 0 ? 'female' : 'male',
          outfitColor: sp.color,
          clothingStyle: idx === 0 ? 'nepali_daura' : 'kathmandu_street',
          hairStyle: idx % 2 === 0 ? 'layered_long' : 'slick_back',
          accessory: idx === 1 ? 'sunglasses' : 'none',
        },
      });
    });

    // Diverse Walking Pedestrians across Kathmandu, Pokhara & Terai
    const npcColors = ['#0284c7', '#be123c', '#0f766e', '#a16207', '#4338ca', '#b91c1c', '#d97706'];
    const faceStyles: FaceStyle[] = ['oval', 'angular', 'broad'];
    const hairStyles: HairStyle[] = ['short_taper', 'layered_long', 'top_knot', 'slick_back', 'braid'];
    const clothStyles: ClothingStyle[] = ['urban_parka', 'nepali_daura', 'kathmandu_street', 'trekking_vest', 'formal_blazer'];
    const shoeStyles: ShoeStyle[] = ['sneakers', 'hiking_boots', 'dress_shoes'];
    const accessories: AccessoryType[] = ['none', 'dhaka_topi', 'scarf', 'sunglasses', 'none'];
    const skins = ['#c68b63', '#d49a73', '#b87a52', '#e0ad89', '#8d5534'];

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const rad = 18 + (i % 4) * 14;
      const nx = i >= 13 ? -170 + (i - 13) * 8 : Math.cos(angle) * rad;
      const nz = i >= 13 ? -34 + (i - 13) * 5 : Math.sin(angle) * rad;
      const gender = i % 2 === 0 ? 'female' : 'male';
      const isPolice = i % 8 === 7;
      spawnNpc({
        id: `npc_${i}`,
        x: nx,
        z: nz,
        rotY: Math.random() * Math.PI * 2,
        kind: isPolice ? 'police' : 'civilian',
        custom: {
          name: isPolice ? `Officer ${i + 1}` : `Citizen ${i + 1}`,
          gender,
          outfitColor: npcColors[i % npcColors.length],
          hairColor: i % 5 === 0 ? '#451a03' : '#1e1b18',
          skinTone: skins[i % skins.length],
          faceStyle: faceStyles[i % faceStyles.length],
          hairStyle: hairStyles[(i + (gender === 'female' ? 1 : 0)) % hairStyles.length],
          clothingStyle: clothStyles[i % clothStyles.length],
          shoeStyle: shoeStyles[i % shoeStyles.length],
          accessory: accessories[i % accessories.length],
          heightScale: 0.96 + (i % 4) * 0.025,
          buildScale: 0.94 + (i % 3) * 0.04,
        },
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
  };

  private onContextRestored = () => {
    this.contextLost = false;
  };

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onWindowBlur = () => {
    this.keys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.virtualBrake = false;
    this.isDraggingCam = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    gameAudio.unlock();

    if (e.code === 'Escape') {
      if (this.screenMode === 'playing') {
        this.callbacks.onScreenModeRequest('paused');
      } else if (this.screenMode === 'paused') {
        this.callbacks.onScreenModeRequest('playing');
      }
      return;
    }

    if (this.screenMode !== 'playing') return;

    if (!this.keys.has(e.code)) {
      if (e.code === 'Space') this.jumpBufferTimer = 0.14;
      if (e.code === 'KeyF') this.handleEnterExitVehicle();
      if (e.code === 'KeyE') this.handleInteract();
      if (e.code === 'KeyH' && this.currentVehicle) gameAudio.playHorn();
      if (e.code === 'KeyC' && !this.currentVehicle) this.isCrouching = !this.isCrouching;
      if (e.code === 'KeyR') this.reloadWeapon();
      if (e.code === 'Digit1') this.selectWeapon('fists');
      if (e.code === 'Digit2') this.selectWeapon('khukuri');
      if (e.code === 'Digit3') this.selectWeapon('pistol');
      if (e.code === 'Digit4') this.selectWeapon('carbine');
    }

    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.screenMode !== 'playing') return;
    gameAudio.unlock();
    if (e.button === 0 && !this.currentVehicle) {
      // Left-click performs attack unless dragging with right-click or touch
      if (e.pointerType === 'mouse') {
        this.triggerAttack();
      }
    }
    this.isDraggingCam = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCam || this.screenMode !== 'playing') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const sens = 0.0045 * this.settings.cameraSensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens, 0.08, 1.05);
  };

  private onPointerUp = () => {
    this.isDraggingCam = false;
  };

  private onWheel = (e: WheelEvent) => {
    this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.005, 4.2, 16);
  };

  // --- Public Controls for UI ---

  public setScreenMode(mode: GameScreenMode): void {
    this.screenMode = mode;
    if (mode !== 'playing') {
      this.keys.clear();
      gameAudio.updateEngine(false, 0, null);
      gameAudio.updateSiren(false, this.elapsed);
    }
  }

  public applySettings(next: GameSettings): void {
    this.settings = { ...next, audio: { ...next.audio } };
    gameAudio.applySettings(this.settings.audio);

    const prCap = this.isSoftwareGl
      ? 1
      : next.graphics === 'low'
        ? 0.85
        : next.graphics === 'medium'
          ? 1.15
          : next.graphics === 'high'
            ? Math.min(window.devicePixelRatio, 1.6)
            : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(prCap);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && next.graphics !== 'low';
    this.sunLight.castShadow = this.renderer.shadowMap.enabled;
  }

  public updateCustomization(next: PlayerCustomization): void {
    this.customization = { ...next };
    this.playerRig.updateAppearance(next);
  }

  public updateProgress(next: PlayerProgress): void {
    this.progress = { ...next };
  }

  public setWeather(w: WeatherType): void {
    this.weather = w;
    this.showBanner(`Weather set to ${w.replace('_', ' ').toUpperCase()}`);
  }

  public setTimeOfDay(hour: number): void {
    this.timeOfDay = ((hour % 24) + 24) % 24;
  }

  public selectWeapon(w: WeaponId): void {
    this.currentWeapon = w;
    this.playerRig.setWeaponVisual(w);
  }

  public reloadWeapon(): void {
    const spec = WEAPON_CATALOG[this.currentWeapon];
    if (!spec.isMelee) {
      this.ammoMap[this.currentWeapon] = spec.clipSize;
      gameAudio.playUiClick();
      this.showBanner(`${spec.name} reloaded`);
    }
  }

  public setVirtualInput(mx: number, my: number, sprint: boolean, brake: boolean): void {
    this.virtualMoveX = mx;
    this.virtualMoveY = my;
    this.virtualSprint = sprint;
    this.virtualBrake = brake;
  }

  public triggerAction(action: 'jump' | 'enter' | 'attack' | 'interact' | 'horn'): void {
    gameAudio.unlock();
    if (action === 'jump') this.jumpBufferTimer = 0.15;
    if (action === 'enter') this.handleEnterExitVehicle();
    if (action === 'attack') this.triggerAttack();
    if (action === 'interact') this.handleInteract();
    if (action === 'horn' && this.currentVehicle) gameAudio.playHorn();
  }

  public spawnGarageVehicle(specId: string, colorHex: string): void {
    const spec = VEHICLE_CATALOG.find((v) => v.id === specId);
    if (!spec) return;
    const spawnX = this.playerX + Math.sin(this.playerRotY) * 4.5;
    const spawnZ = this.playerZ + Math.cos(this.playerRotY) * 4.5;
    const rig = createVehicleRig(spec, colorHex, this.textures.contactShadow, this.isSoftwareGl);
    const y = spec.isBoat ? WATER_LEVEL : groundHeightAt(spawnX, spawnZ);
    rig.group.position.set(spawnX, y, spawnZ);
    rig.group.rotation.y = this.playerRotY;
    this.scene.add(rig.group);
    const veh: WorldVehicle = {
      id: `garage_${specId}_${Date.now()}`,
      spec,
      rig,
      x: spawnX,
      y,
      z: spawnZ,
      rotY: this.playerRotY,
      speed: 0,
      steerAngle: 0,
      fuel: 100,
      health: 100,
      isPolice: spec.category === 'police',
      aiState: 'parked',
      aiWaypointIdx: 0,
      rollAngle: 0,
      pitchAngle: 0,
    };
    this.vehicles.push(veh);
    this.showBanner(`Delivered ${spec.name} nearby`);
  }

  public startMission(missionId: string): void {
    const m = STORY_MISSIONS.find((item) => item.id === missionId);
    if (!m) return;
    this.activeMission = m;
    this.missionStepIdx = 0;
    const first = m.checkpoints[0];
    this.missionTimeLeft = first.timeLimitSec ?? null;
    this.missionMarker.visible = true;
    this.missionMarker.position.set(first.x, groundHeightAt(first.x, first.z), first.z);
    this.showBanner(`Mission Started: ${m.title}`);
    if (first.enemiesCount) {
      this.spawnMissionEnemies(first.x, first.z, first.enemiesCount);
    }
  }

  public abortMission(): void {
    this.activeMission = null;
    this.missionMarker.visible = false;
    this.missionTimeLeft = null;
    this.showBanner('Mission aborted');
  }

  public setWaypoint(x: number, z: number, label: string): void {
    this.waypoint = { x, z, label };
    this.showBanner(`GPS Waypoint: ${label}`);
  }

  public fastTravel(x: number, z: number, label: string): void {
    if (this.currentVehicle) {
      this.exitVehicle();
    }
    this.playerX = x;
    this.playerZ = z;
    this.playerY = groundHeightAt(x, z);
    this.playerVy = 0;
    this.playerRig.group.position.set(x, this.playerY, z);
    this.camPos.set(x, this.playerY + 5, z + 8);
    this.showBanner(`Arrived at ${label}`);
  }

  public getSaveSnapshotState() {
    return {
      playerPos: {
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        rotY: this.playerRotY,
      },
      weather: this.weather,
      timeOfDay: this.timeOfDay,
    };
  }

  public loadFromSaveState(pos: { x: number; y: number; z: number; rotY: number }, weather: WeatherType, timeOfDay: number): void {
    if (this.currentVehicle) this.exitVehicle();
    this.playerX = pos.x;
    this.playerY = pos.y;
    this.playerZ = pos.z;
    this.playerRotY = pos.rotY;
    this.weather = weather;
    this.timeOfDay = timeOfDay;
    this.playerRig.group.position.set(pos.x, pos.y, pos.z);
  }

  public syncRemotePlayers(players: RemotePlayerData[], selfId: string | null): void {
    this.isMultiplayer = selfId !== null;
    const activeIds = new Set<string>();

    for (const p of players) {
      if (p.id === selfId) continue;
      activeIds.add(p.id);
      const fullCustom: PlayerCustomization = {
        ...DEFAULT_CUSTOMIZATION,
        ...(p.customization || {}),
        name: p.name,
        gender: p.gender,
        outfitColor: p.outfitColor,
      };
      const customSig = JSON.stringify(fullCustom);
      let entry = this.remoteRigs.get(p.id);
      if (!entry) {
        const rig = createCharacterRig(fullCustom, this.textures.contactShadow, 'remote');
        rig.group.position.set(p.x, p.y, p.z);
        this.scene.add(rig.group);
        entry = {
          rig,
          customSig,
          animState: p.animState || 'idle',
          speed: p.speed || 0,
          targetX: p.x,
          targetY: p.y,
          targetZ: p.z,
          targetRotY: p.rotY,
          x: p.x,
          y: p.y,
          z: p.z,
          rotY: p.rotY,
        };
        this.remoteRigs.set(p.id, entry);
      } else if (entry.customSig !== customSig) {
        entry.rig.updateAppearance(fullCustom, 'remote');
        entry.customSig = customSig;
      }

      entry.targetX = p.x;
      entry.targetY = p.y;
      entry.targetZ = p.z;
      entry.targetRotY = p.rotY;
      entry.animState = p.animState || (p.speed > 0.4 ? 'run' : 'idle');
      entry.speed = p.speed || 0;

      if (p.vehicleType && entry.vehicleType !== p.vehicleType) {
        if (entry.vehicleRig) this.scene.remove(entry.vehicleRig.group);
        const spec = VEHICLE_CATALOG.find((v) => v.id === p.vehicleType);
        if (spec) {
          const vRig = createVehicleRig(
            spec,
            p.vehicleColor || spec.defaultColor,
            this.textures.contactShadow,
            this.isSoftwareGl,
          );
          this.scene.add(vRig.group);
          entry.vehicleRig = vRig;
          entry.vehicleType = p.vehicleType;
          // Seat remote player visibly inside driverMount
          entry.rig.contactShadow.visible = false;
          entry.rig.group.position.set(0, 0, 0);
          entry.rig.group.rotation.set(0, 0, 0);
          vRig.driverMount.add(entry.rig.group);
        }
      } else if (!p.vehicleType && entry.vehicleRig) {
        this.scene.add(entry.rig.group);
        entry.rig.contactShadow.visible = true;
        this.scene.remove(entry.vehicleRig.group);
        entry.vehicleRig = undefined;
        entry.vehicleType = null;
      }
    }

    for (const [id, entry] of this.remoteRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.rig.group);
        if (entry.vehicleRig) this.scene.remove(entry.vehicleRig.group);
        this.remoteRigs.delete(id);
      }
    }
  }

  // --- Gameplay Helpers ---

  private showBanner(msg: string): void {
    this.currentBanner = msg;
    this.bannerTimer = 3.2;
  }

  private showDialogue(speaker: string, line: string): void {
    this.currentDialogue = { speaker, line };
    this.dialogueTimer = 6.5;
  }

  private spawnMissionEnemies(cx: number, cz: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const ex = cx + Math.cos(ang) * 8;
      const ez = cz + Math.sin(ang) * 8;
      const ey = groundHeightAt(ex, ez);
      const rig = createCharacterRig(
        {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Syndicate Enforcer',
          gender: i % 3 === 0 ? 'female' : 'male',
          outfitColor: '#7f1d1d',
          hairColor: '#111827',
          skinTone: '#c68b63',
          faceStyle: 'angular',
          hairStyle: 'slick_back',
          clothingStyle: 'trekking_vest',
          accessory: 'sunglasses',
        },
        this.textures.contactShadow,
        'enemy',
      );
      rig.setWeaponVisual('carbine');
      rig.group.position.set(ex, ey, ez);
      this.scene.add(rig.group);
      this.npcs.push({
        id: `enemy_${Date.now()}_${i}`,
        rig,
        x: ex,
        y: ey,
        z: ez,
        rotY: 0,
        speed: 3.1,
        health: 75,
        kind: 'enemy',
        frameOffset: i % 3,
        fleeTimer: 0,
        hitFlashTimer: 0,
        wanderAngle: 0,
        wanderTimer: 0,
      });
    }
  }

  private addCrimeHeat(amount: number): void {
    this.wantedHeat = Math.min(100, this.wantedHeat + amount);
    const nextLevel = Math.min(5, Math.ceil(this.wantedHeat / 20));
    if (nextLevel > this.wantedLevel) {
      this.wantedLevel = nextLevel;
      this.showBanner(`WANTED LEVEL ${this.wantedLevel}`);
      this.spawnPoliceResponder();
      if (this.wantedLevel >= 3 && !this.policeHeli) {
        this.spawnPoliceHelicopter();
      }
    }
  }

  private spawnPoliceResponder(): void {
    const activePursuit = this.vehicles.filter((v) => v.aiState === 'pursuit').length;
    if (activePursuit >= Math.min(4, this.wantedLevel + 1)) return;

    const spec = VEHICLE_CATALOG.find((v) => v.id === 'aarya_police')!;
    const ang = Math.random() * Math.PI * 2;
    const sx = THREE.MathUtils.clamp(this.playerX + Math.cos(ang) * 58, -WORLD_RADIUS + 20, WORLD_RADIUS - 20);
    const sz = THREE.MathUtils.clamp(this.playerZ + Math.sin(ang) * 58, -WORLD_RADIUS + 20, WORLD_RADIUS - 20);
    const sy = groundHeightAt(sx, sz);
    const rig = createVehicleRig(spec, spec.defaultColor, this.textures.contactShadow, this.isSoftwareGl);
    rig.group.position.set(sx, sy, sz);
    this.scene.add(rig.group);
    const veh: WorldVehicle = {
      id: `police_${Date.now()}_${Math.random()}`,
      spec,
      rig,
      x: sx,
      y: sy,
      z: sz,
      rotY: 0,
      speed: 14,
      steerAngle: 0,
      fuel: 100,
      health: 120,
      isPolice: true,
      aiState: 'pursuit',
      aiWaypointIdx: 0,
      rollAngle: 0,
      pitchAngle: 0,
    };
    this.attachVehicleOccupants(veh, true);
    this.vehicles.push(veh);
  }

  private spawnPoliceHelicopter(): void {
    const spec = VEHICLE_CATALOG.find((v) => v.id === 'himal_heli')!;
    const rig = createVehicleRig(spec, '#1e3a8a', this.textures.contactShadow, this.isSoftwareGl);
    const hx = this.playerX - 55;
    const hz = this.playerZ - 55;
    rig.group.position.set(hx, 26, hz);
    this.scene.add(rig.group);
    this.policeHeli = {
      id: 'police_heli',
      spec,
      rig,
      x: hx,
      y: 26,
      z: hz,
      rotY: 0,
      speed: 18,
      steerAngle: 0,
      fuel: 100,
      health: 180,
      isPolice: true,
      aiState: 'pursuit',
      aiWaypointIdx: 0,
      rollAngle: 0,
      pitchAngle: 0,
    };
    this.attachVehicleOccupants(this.policeHeli, true);
  }

  private handleEnterExitVehicle(): void {
    if (this.currentVehicle) {
      this.exitVehicle();
      return;
    }

    let nearest: WorldVehicle | null = null;
    let bestDist = 4.6;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        nearest = v;
      }
    }
    if (!nearest) return;

    if (nearest.aiState === 'traffic' || nearest.isPolice) {
      this.addCrimeHeat(nearest.isPolice ? 32 : 16);
    }
    // Remove NPC driver if commandeering a moving traffic/police vehicle
    if (nearest.driverRig) {
      nearest.rig.driverMount.remove(nearest.driverRig.group);
      nearest.driverRig = undefined;
    }
    nearest.aiState = 'parked';
    this.currentVehicle = nearest;

    // Seat the 3D player character directly inside the vehicle's driver seat
    this.playerRig.contactShadow.visible = false;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(0, 0, 0);
    this.playerRig.group.rotation.set(0, 0, 0);
    nearest.rig.driverMount.add(this.playerRig.group);
    this.playerRig.animate(0.1, 0, true, false, false, 0, 'drive');

    this.progress.stats.vehiclesDriven += 1;
    this.callbacks.onProgressUpdate({ ...this.progress });
    gameAudio.playUiClick();
  }

  private exitVehicle(): void {
    if (!this.currentVehicle) return;
    const v = this.currentVehicle;
    this.playerX = v.x + Math.cos(v.rotY) * (v.spec.width * 0.8 + 0.9);
    this.playerZ = v.z - Math.sin(v.rotY) * (v.spec.width * 0.8 + 0.9);
    this.playerY = Math.max(groundHeightAt(this.playerX, this.playerZ), v.y);
    this.playerVy = 0;
    this.scene.add(this.playerRig.group);
    this.playerRig.contactShadow.visible = true;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.set(0, this.playerRotY, 0);
    this.currentVehicle = null;
    gameAudio.updateEngine(false, 0, null);
  }

  private handleInteract(): void {
    // Check nearby Named / Shopkeeper / Security Characters first
    for (const npc of this.npcs) {
      if (npc.dialogue && npc.name && Math.hypot(npc.x - this.playerX, npc.z - this.playerZ) < 4.5) {
        npc.interactTimer = 3.2;
        npc.rotY = Math.atan2(this.playerX - npc.x, this.playerZ - npc.z);
        this.showDialogue(npc.name, npc.dialogue);
        gameAudio.playUiClick();
        return;
      }
    }

    for (const lm of LANDMARKS) {
      const d = Math.hypot(lm.x - this.playerX, lm.z - this.playerZ);
      if (d < 9) {
        if (lm.kind === 'garage') {
          this.callbacks.onOpenGarage();
        } else if (lm.kind === 'hospital') {
          this.health = this.maxHealth;
          this.stamina = this.maxStamina;
          this.showBanner('Hospital Trauma Care: Health & Stamina Restored');
          gameAudio.playRewardChime();
        } else if (lm.kind === 'police' && this.wantedLevel > 0) {
          const fine = this.wantedLevel * 400;
          if (this.progress.money >= fine) {
            this.progress.money -= fine;
            this.wantedHeat = 0;
            this.wantedLevel = 0;
            this.callbacks.onProgressUpdate({ ...this.progress });
            this.showBanner(`Paid NPR ${fine} bail — Wanted cleared`);
          }
        } else {
          this.showDialogue(lm.name, lm.description);
        }
        return;
      }
    }
  }

  private triggerAttack(): void {
    if (this.attackCooldown > 0 || this.currentVehicle) return;
    const spec = WEAPON_CATALOG[this.currentWeapon];
    if (!spec.isMelee) {
      if (this.ammoMap[this.currentWeapon] <= 0) {
        this.reloadWeapon();
        return;
      }
      this.ammoMap[this.currentWeapon] -= 1;
    }

    this.attackCooldown = spec.cooldown;
    this.attackAnimTimer = 0.25;
    gameAudio.playWeapon(spec.isMelee);

    const dirX = Math.sin(this.playerRotY);
    const dirZ = Math.cos(this.playerRotY);

    if (spec.isMelee) {
      for (const npc of this.npcs) {
        const dx = npc.x - this.playerX;
        const dz = npc.z - this.playerZ;
        const dist = Math.hypot(dx, dz);
        if (dist < spec.range) {
          this.damageNpc(npc, spec.damage);
        }
      }
    } else {
      this.camShake = Math.max(this.camShake, 0.12);
      const projMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 6, 6),
        new THREE.MeshBasicMaterial({ color: '#fbbf24' }),
      );
      const sx = this.playerX + dirX * 0.8;
      const sy = this.playerY + 1.35;
      const sz = this.playerZ + dirZ * 0.8;
      projMesh.position.set(sx, sy, sz);
      this.scene.add(projMesh);
      this.projectiles.push({
        mesh: projMesh,
        x: sx,
        y: sy,
        z: sz,
        vx: dirX * 58,
        vy: 0,
        vz: dirZ * 58,
        life: 1.2,
        damage: spec.damage,
        fromPlayer: true,
      });

      // Gunfire alerts nearby pedestrians & raises police attention
      this.addCrimeHeat(8);
      for (const npc of this.npcs) {
        if (npc.kind === 'civilian' && Math.hypot(npc.x - this.playerX, npc.z - this.playerZ) < 28) {
          npc.fleeTimer = 6;
        }
      }
    }
  }

  private damageNpc(npc: WorldNpc, dmg: number): void {
    npc.health -= dmg;
    npc.hitFlashTimer = 0.14;
    this.hitstopTimer = 0.04; // 40ms heavy impact hitstop
    this.camShake = Math.max(this.camShake, 0.22);
    this.spawnBurst(npc.x, npc.y + 1.1, npc.z, '#f97316', 6);
    gameAudio.playImpact(1.1);

    if (npc.kind === 'civilian' || npc.kind === 'police') {
      this.addCrimeHeat(npc.kind === 'police' ? 28 : 16);
      npc.fleeTimer = 8;
    }

    if (npc.health <= 0) {
      this.scene.remove(npc.rig.group);
      this.npcs = this.npcs.filter((n) => n !== npc);
      if (npc.kind === 'enemy') {
        this.awardMoneyAndXp(250, 40);
      }
    }
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: string, count: number): void {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 8,
        vy: 2 + Math.random() * 5,
        vz: (Math.random() - 0.5) * 8,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  private awardMoneyAndXp(money: number, xp: number): void {
    this.progress.money += money;
    this.progress.xp += xp;
    const newLevel = 1 + Math.floor(this.progress.xp / 500);
    if (newLevel > this.progress.level) {
      this.progress.level = newLevel;
      this.showBanner(`LEVEL UP! Reached Level ${newLevel}`);
    }
    this.callbacks.onProgressUpdate({ ...this.progress });
  }

  // --- Core Simulation Loop ---

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (rawDt > 0.001) {
        this.fpsSamples = THREE.MathUtils.lerp(this.fpsSamples, 1 / rawDt, 0.1);
      }

      if (!this.contextLost) {
        this.stepSimulation(dt, now);
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(dt: number, nowMs: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.elapsed += dt;
    this.simFrameCount += 1;

    // Day/Night & Weather Atmosphere (runs smoothly in both Title & Playing)
    this.timeOfDay = (this.timeOfDay + dt * 0.035) % 24;
    this.updateAtmosphere(dt);
    this.world.updateEnvironment(this.timeOfDay, dt);

    // Animate Landmark Rings
    for (const b of this.world.landmarkBeacons) {
      b.ring.rotation.z += dt * 1.4;
    }

    if (this.screenMode === 'title') {
      this.titleOrbitAngle += dt * 0.14;
      const rad = 52;
      this.camera.position.set(
        Math.cos(this.titleOrbitAngle) * rad,
        24 + Math.sin(this.titleOrbitAngle * 0.7) * 5,
        Math.sin(this.titleOrbitAngle) * rad,
      );
      this.camera.lookAt(0, 6, -10);
      return;
    }

    if (this.screenMode === 'paused') {
      return;
    }

    // Active Gameplay Simulation
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.attackAnimTimer > 0) this.attackAnimTimer -= dt;
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.currentBanner = null;
    }
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.currentDialogue = null;
    }
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    // Traffic Lights State Machine
    this.trafficPhaseTimer += dt;
    if (this.trafficPhaseTimer > 8) {
      this.trafficPhaseTimer = 0;
      this.trafficGreenAxis = this.trafficGreenAxis === 'x' ? 'z' : 'x';
      for (const tl of this.world.trafficLights) {
        const isGreen = tl.axis === this.trafficGreenAxis;
        (tl.greenBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 1.8 : 0.1;
        (tl.redBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 0.1 : 1.8;
      }
    }

    if (this.currentVehicle) {
      this.stepDrivenVehicle(dt);
    } else {
      this.stepPlayerOnFoot(dt);
    }

    this.stepAiVehicles(dt);
    this.stepNpcs(dt);
    this.stepProjectilesAndParticles(dt);
    this.stepPoliceAndWanted(dt);
    this.stepMissionAndLandmarks(dt);
    this.stepRemotePlayers(dt);
    this.stepThirdPersonCamera(dt);

    // Outgoing Multiplayer Sync (~15Hz)
    if (this.isMultiplayer && nowMs - this.lastSyncSentAt > 66) {
      this.lastSyncSentAt = nowMs;
      this.callbacks.onSyncOutgoing({
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        rotY: this.currentVehicle ? this.currentVehicle.rotY : this.playerRotY,
        inVehicleId: this.currentVehicle ? this.currentVehicle.id : null,
        vehicleType: this.currentVehicle ? this.currentVehicle.spec.id : null,
        vehicleColor: this.currentVehicle ? this.currentVehicle.spec.defaultColor : null,
        region: getRegionAt(this.playerX, this.playerZ),
        speed: this.currentVehicle ? Math.abs(this.currentVehicle.speed) : this.playerSpeed,
        animState: this.getPlayerAnimState(),
        customization: this.customization,
      });
    }

    // Throttled HUD update (~15Hz)
    if (nowMs - this.lastHudPush > 66) {
      this.lastHudPush = nowMs;
      this.pushHudSnapshot();
    }
  }

  private getPlayerAnimState(): CharacterAnimState {
    if (this.currentVehicle) return 'drive';
    const groundY = groundHeightAt(this.playerX, this.playerZ);
    const inLake = Math.hypot(this.playerX + 195, this.playerZ + 35) < 43 && groundY < WATER_LEVEL - 0.3;
    if (inLake) return 'swim';
    if (!this.isGrounded) return this.playerVy < -1.5 ? 'fall' : 'jump';
    if (this.isCrouching) return 'crouch';
    if (this.attackAnimTimer > 0) return 'combat';
    if (this.playerY > 12 && this.playerSpeed > 1.2) {
      const slopeAhead = groundHeightAt(
        this.playerX + Math.sin(this.playerRotY) * 1.2,
        this.playerZ + Math.cos(this.playerRotY) * 1.2,
      );
      if (slopeAhead - groundY > 0.45) return 'climb';
    }
    if (this.playerSpeed > 8) return 'sprint';
    if (this.playerSpeed > 4.2) return 'run';
    if (this.playerSpeed > 0.35) return 'walk';
    return 'idle';
  }

  private updateAtmosphere(dt: number): void {
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    this.sunLight.position.set(
      this.playerX + Math.cos(sunAngle) * 110,
      Math.max(8, sunElev * 120),
      this.playerZ + 45,
    );
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ);

    const dayFactor = THREE.MathUtils.clamp((sunElev + 0.18) / 0.6, 0, 1);
    const isStorm = this.weather === 'rain' || this.weather === 'heavy_rain' || this.weather === 'thunderstorm';
    const isSnow = this.weather === 'snow' || this.playerY > 14;

    if (this.weather === 'thunderstorm') {
      this.thunderCooldown -= dt;
      if (this.thunderCooldown <= 0) {
        this.thunderCooldown = 7 + Math.random() * 10;
        this.lightningFlash = 1.6;
        gameAudio.playThunder();
      }
    }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 5);

    const weatherDim =
      this.weather === 'sunny'
        ? 1
        : this.weather === 'cloudy'
          ? 0.78
          : this.weather === 'fog'
            ? 0.72
            : 0.56;

    this.sunLight.intensity = (0.18 + dayFactor * 1.55) * weatherDim + this.lightningFlash;
    this.hemiLight.intensity = 0.28 + dayFactor * 0.52;

    this.skyColor.set(
      this.weather === 'sunny'
        ? '#7dd3fc'
        : this.weather === 'fog'
          ? '#cbd5e1'
          : isStorm
            ? '#334155'
            : '#94a3b8',
    );
    this.skyColor.lerp(this.nightColor, 1 - dayFactor);

    (this.scene.background as THREE.Color).copy(this.skyColor);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(this.skyColor);
    fog.density =
      this.weather === 'fog'
        ? 0.013
        : this.weather === 'heavy_rain' || this.weather === 'thunderstorm'
          ? 0.0075
          : this.weather === 'rain' || this.weather === 'snow'
            ? 0.005
            : 0.0028;

    // Rain & Snow particles centered around player
    const showPrecip = isStorm || isSnow;
    this.rainPoints.visible = showPrecip;
    gameAudio.updateRainAmbience(
      this.weather === 'heavy_rain' || this.weather === 'thunderstorm' ? 1 : this.weather === 'rain' ? 0.55 : 0,
    );

    if (showPrecip) {
      const mat = this.rainPoints.material as THREE.PointsMaterial;
      mat.size = isSnow ? 0.36 : 0.2;
      mat.color.set(isSnow ? '#f8fafc' : '#cbd5e1');
      const posAttr = this.rainGeo.attributes.position as THREE.BufferAttribute;
      const fallSpeed = isSnow ? 7.5 : this.weather === 'heavy_rain' ? 32 : 23;
      const windX = isStorm ? 4.5 : 1.2;
      for (let i = 0; i < posAttr.count; i++) {
        let px = posAttr.getX(i) + windX * dt;
        let py = posAttr.getY(i) - fallSpeed * dt;
        const pz = posAttr.getZ(i);
        if (py < 0) {
          py = 34;
          px = this.playerX + (Math.random() - 0.5) * 90;
          posAttr.setZ(i, this.playerZ + (Math.random() - 0.5) * 90);
        }
        posAttr.setXY(i, px, py);
      }
      posAttr.needsUpdate = true;
    }
  }

  private resolveColliderPush(x: number, z: number, radius: number): { x: number; z: number; hit: boolean } {
    let rx = THREE.MathUtils.clamp(x, -WORLD_RADIUS, WORLD_RADIUS);
    let rz = THREE.MathUtils.clamp(z, -WORLD_RADIUS, WORLD_RADIUS);
    let hit = rx !== x || rz !== z;

    for (const c of this.world.colliders) {
      const closestX = THREE.MathUtils.clamp(rx, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(rz, c.minZ, c.maxZ);
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq) || 0.001;
        const push = radius - dist;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
      }
    }
    return { x: rx, z: rz, hit };
  }

  private stepPlayerOnFoot(dt: number): void {
    let inX = 0;
    let inZ = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inX += 1;

    if (Math.abs(this.virtualMoveX) > 0.05 || Math.abs(this.virtualMoveY) > 0.05) {
      inX += this.virtualMoveX;
      inZ += this.virtualMoveY;
    }

    const inputLen = Math.hypot(inX, inZ);
    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualSprint) &&
      inputLen > 0.1 &&
      !this.isCrouching &&
      this.stamina > 4;

    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 18);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 14);
    }

    const maxMoveSpeed = this.isCrouching ? 3.2 : wantsSprint ? 10.5 : 5.8;

    if (inputLen > 0.08) {
      const nx = inX / Math.max(1, inputLen);
      const nz = inZ / Math.max(1, inputLen);
      // Camera-relative movement direction
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const moveX = nx * cosY + nz * sinY;
      const moveZ = -nx * sinY + nz * cosY;

      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.playerRotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerRotY += diff * Math.min(1, dt * 12);

      this.playerSpeed = THREE.MathUtils.lerp(this.playerSpeed, maxMoveSpeed, Math.min(1, dt * 10));
      const nextX = this.playerX + moveX * this.playerSpeed * dt;
      const nextZ = this.playerZ + moveZ * this.playerSpeed * dt;
      const resolved = this.resolveColliderPush(nextX, nextZ, 0.55);
      this.playerX = resolved.x;
      this.playerZ = resolved.z;
    } else {
      this.playerSpeed = THREE.MathUtils.lerp(this.playerSpeed, 0, Math.min(1, dt * 12));
    }

    // Ground & Swimming physics with coyote time + jump buffering
    const groundY = groundHeightAt(this.playerX, this.playerZ);
    const inLake = Math.hypot(this.playerX + 195, this.playerZ + 35) < 43 && groundY < WATER_LEVEL - 0.3;
    const floorY = inLake ? WATER_LEVEL - 0.55 : groundY;

    if (this.isGrounded) {
      this.coyoteTimer = 0.14;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && !inLake) {
      this.playerVy = 8.4;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    this.playerVy -= 21 * dt;
    this.playerY += this.playerVy * dt;
    if (this.playerY <= floorY) {
      this.playerY = floorY;
      this.playerVy = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerRotY;
    const animState = this.getPlayerAnimState();
    this.playerRig.animate(dt, this.playerSpeed, this.isGrounded, this.isCrouching, inLake, this.attackAnimTimer, animState);
    gameAudio.updateFootstep(dt, this.isGrounded && !inLake && this.playerSpeed > 0.6, wantsSprint);
  }

  private stepDrivenVehicle(dt: number): void {
    const v = this.currentVehicle!;
    const spec = v.spec;

    let throttle = 0;
    let steer = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;

    if (Math.abs(this.virtualMoveX) > 0.05 || Math.abs(this.virtualMoveY) > 0.05) {
      throttle -= this.virtualMoveY;
      steer -= this.virtualMoveX;
    }

    const handbrake = this.keys.has('Space') || this.virtualBrake;
    const isWet = this.weather === 'rain' || this.weather === 'heavy_rain' || this.weather === 'thunderstorm' || this.weather === 'snow';
    const gripFactor = isWet ? spec.grip * 0.86 : spec.grip;

    if (v.fuel > 0 && Math.abs(throttle) > 0.05) {
      v.fuel = Math.max(0, v.fuel - dt * 0.35);
      const accelRate = throttle > 0 ? spec.accel : spec.accel * 0.72;
      v.speed += throttle * accelRate * dt;
    } else {
      v.speed *= Math.exp(-1.5 * dt);
    }

    if (handbrake && !spec.isAircraft) {
      v.speed *= Math.exp(-5.2 * dt);
    }

    v.speed = THREE.MathUtils.clamp(v.speed, -spec.maxSpeed * 0.38, spec.maxSpeed);

    // Steering & body roll suspension
    const targetSteer = steer * 0.48;
    v.steerAngle = THREE.MathUtils.lerp(v.steerAngle, targetSteer, Math.min(1, dt * 10));
    const speedTurnScale = spec.isAircraft ? 1 : Math.min(1, Math.abs(v.speed) / 6);
    const reverseSign = v.speed >= -0.2 ? 1 : -1;
    v.rotY += steer * spec.turnSpeed * speedTurnScale * reverseSign * dt * gripFactor;

    const fwdX = Math.sin(v.rotY);
    const fwdZ = Math.cos(v.rotY);
    const nextX = v.x + fwdX * v.speed * dt;
    const nextZ = v.z + fwdZ * v.speed * dt;

    if (spec.isAircraft) {
      v.x = THREE.MathUtils.clamp(nextX, -WORLD_RADIUS, WORLD_RADIUS);
      v.z = THREE.MathUtils.clamp(nextZ, -WORLD_RADIUS, WORLD_RADIUS);
      let climb = 0;
      if (this.keys.has('Space')) climb += 12;
      if (this.keys.has('ShiftLeft') || this.keys.has('KeyC')) climb -= 11;
      const minFloor = groundHeightAt(v.x, v.z);
      v.y = THREE.MathUtils.clamp(v.y + climb * dt, minFloor, 68);
      if (v.rig.mainRotor) v.rig.mainRotor.rotation.y += dt * 22;
      if (v.rig.tailRotor) v.rig.tailRotor.rotation.x += dt * 28;
    } else if (spec.isBoat) {
      const distLake = Math.hypot(nextX + 195, nextZ + 35);
      if (distLake < 43) {
        v.x = nextX;
        v.z = nextZ;
      } else {
        v.speed *= -0.3;
      }
      v.y = WATER_LEVEL + Math.sin(this.elapsed * 3) * 0.06;
    } else {
      const radius = spec.width * 0.55;
      const res = this.resolveColliderPush(nextX, nextZ, radius);
      if (res.hit && Math.abs(v.speed) > 9) {
        this.camShake = Math.max(this.camShake, 0.28);
        gameAudio.playImpact(Math.abs(v.speed) / 20);
        v.health = Math.max(10, v.health - Math.abs(v.speed) * 0.35);
        v.speed *= -0.3;
      } else {
        v.x = res.x;
        v.z = res.z;
      }
      const gy = groundHeightAt(v.x, v.z);
      v.y = THREE.MathUtils.lerp(v.y, gy, Math.min(1, dt * 16));
    }

    // Distance stat tracking
    this.progress.stats.distanceDrivenKm += (Math.abs(v.speed) * dt) / 1000;

    // Suspension pitch & roll
    const targetRoll = steer * (v.speed / spec.maxSpeed) * 0.08;
    const targetPitch = -throttle * 0.035;
    v.rollAngle = THREE.MathUtils.lerp(v.rollAngle, targetRoll, Math.min(1, dt * 8));
    v.pitchAngle = THREE.MathUtils.lerp(v.pitchAngle, targetPitch, Math.min(1, dt * 8));

    v.rig.group.position.set(v.x, v.y, v.z);
    v.rig.group.rotation.set(v.pitchAngle, v.rotY, v.rollAngle, 'YXZ');

    // Spin wheels & steer front pivots
    for (const w of v.rig.wheels) {
      w.rotation.x += v.speed * dt * 2.4;
    }
    for (const fp of v.rig.frontWheelPivots) {
      fp.rotation.y = v.steerAngle;
    }

    const isNight = this.timeOfDay < 6.2 || this.timeOfDay > 18.4;
    v.rig.setLights(isNight || this.weather !== 'sunny', throttle < -0.1 || handbrake);

    if (v.isPolice && v.rig.sirenRed && v.rig.sirenBlue) {
      const blink = Math.sin(this.elapsed * 16) > 0;
      (v.rig.sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = blink ? 2.5 : 0.2;
      (v.rig.sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = blink ? 0.2 : 2.5;
    }

    // Sync player coordinates to vehicle & animate driver steering pose
    this.playerX = v.x;
    this.playerY = v.y;
    this.playerZ = v.z;
    this.playerRotY = v.rotY;
    this.playerRig.animate(dt, 0, true, false, false, 0, 'drive');

    gameAudio.updateEngine(true, Math.abs(v.speed) / spec.maxSpeed, spec.category);
  }

  private stepAiVehicles(dt: number): void {
    const nodes = this.world.roadNodes;
    for (const v of this.vehicles) {
      if (v === this.currentVehicle) continue;

      if (v.aiState === 'traffic') {
        const target = nodes[v.aiWaypointIdx % nodes.length];
        const dx = target.x - v.x;
        const dz = target.z - v.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 6) {
          v.aiWaypointIdx = (v.aiWaypointIdx + 1) % nodes.length;
        }

        // Stop at red light or if player/obstacle is directly ahead
        const playerDist = Math.hypot(this.playerX - v.x, this.playerZ - v.z);
        const nearIntersection = dist < 13 && (Math.abs(dx) > Math.abs(dz) ? this.trafficGreenAxis !== 'x' : this.trafficGreenAxis !== 'z');
        const targetSpeed = playerDist < 9 || nearIntersection ? 0 : 10.5;
        v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, Math.min(1, dt * 4));

        const desiredYaw = Math.atan2(dx, dz);
        let diff = desiredYaw - v.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.rotY += diff * Math.min(1, dt * 4);

        v.x += Math.sin(v.rotY) * v.speed * dt;
        v.z += Math.cos(v.rotY) * v.speed * dt;
        v.y = groundHeightAt(v.x, v.z);
        v.rig.group.position.set(v.x, v.y, v.z);
        v.rig.group.rotation.y = v.rotY;
        for (const w of v.rig.wheels) w.rotation.x += v.speed * dt * 2.2;
      } else if (v.aiState === 'pursuit') {
        if (this.wantedLevel === 0) {
          v.aiState = 'traffic';
          continue;
        }
        const dx = this.playerX - v.x;
        const dz = this.playerZ - v.z;
        const dist = Math.hypot(dx, dz);
        const desiredYaw = Math.atan2(dx, dz);
        let diff = desiredYaw - v.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.rotY += diff * Math.min(1, dt * 3.8);

        const chaseSpeed = dist > 9 ? Math.min(v.spec.maxSpeed * 0.72, 24) : 0;
        v.speed = THREE.MathUtils.lerp(v.speed, chaseSpeed, Math.min(1, dt * 4));
        const res = this.resolveColliderPush(
          v.x + Math.sin(v.rotY) * v.speed * dt,
          v.z + Math.cos(v.rotY) * v.speed * dt,
          1.2,
        );
        v.x = res.x;
        v.z = res.z;
        v.y = groundHeightAt(v.x, v.z);
        v.rig.group.position.set(v.x, v.y, v.z);
        v.rig.group.rotation.y = v.rotY;
        for (const w of v.rig.wheels) w.rotation.x += v.speed * dt * 2.5;

        if (v.rig.sirenRed && v.rig.sirenBlue) {
          const blink = Math.sin(this.elapsed * 18) > 0;
          (v.rig.sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = blink ? 2.5 : 0.2;
          (v.rig.sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = blink ? 0.2 : 2.5;
        }

        // Ram / Intercept damage
        if (dist < 3.4 && !this.currentVehicle) {
          this.health = Math.max(0, this.health - dt * 10);
        }
      }
    }
  }

  private stepNpcs(dt: number): void {
    for (const npc of this.npcs) {
      if (npc.hitFlashTimer > 0) {
        npc.hitFlashTimer -= dt;
        (npc.rig.torso.material as THREE.MeshStandardMaterial).emissive.set(
          npc.hitFlashTimer > 0 ? '#ffffff' : '#000000',
        );
      }

      const dx = this.playerX - npc.x;
      const dz = this.playerZ - npc.z;
      const dist = Math.hypot(dx, dz);

      // Distance-based LOD & mobile-style culling
      if (dist > 155) {
        npc.rig.group.visible = false;
        continue;
      }
      npc.rig.group.visible = true;
      const targetLod: 0 | 1 = dist < 38 ? 0 : 1;
      if (npc.lodLevel !== targetLod) {
        npc.lodLevel = targetLod;
        npc.rig.setLodLevel(targetLod);
      }

      // Vehicle collision detection against pedestrians
      if (this.currentVehicle && Math.abs(this.currentVehicle.speed) > 7 && dist < 2.2) {
        this.damageNpc(npc, 40);
        continue;
      }

      let moveSpeed = npc.speed;
      let explicitState: CharacterAnimState | undefined;

      if (npc.interactTimer && npc.interactTimer > 0) {
        npc.interactTimer -= dt;
        moveSpeed = 0;
        explicitState = 'talk';
      } else if (npc.sitting && npc.fleeTimer <= 0) {
        moveSpeed = 0;
        explicitState = 'sit';
      } else if (npc.kind === 'story' || npc.kind === 'shopkeeper' || npc.kind === 'security') {
        moveSpeed = 0;
        if (dist < 6) {
          npc.rotY = Math.atan2(dx, dz);
        }
        explicitState = 'idle';
      } else if (npc.kind === 'enemy') {
        if (dist < 40) {
          npc.rotY = Math.atan2(dx, dz);
          moveSpeed = dist > 12 ? 3.4 : 0;
          if (Math.random() < dt * 0.9 && dist < 34) {
            const pMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.11, 6, 6),
              new THREE.MeshBasicMaterial({ color: '#ef4444' }),
            );
            pMesh.position.set(npc.x, npc.y + 1.35, npc.z);
            this.scene.add(pMesh);
            this.projectiles.push({
              mesh: pMesh,
              x: npc.x,
              y: npc.y + 1.35,
              z: npc.z,
              vx: (dx / Math.max(1, dist)) * 34,
              vy: 0,
              vz: (dz / Math.max(1, dist)) * 34,
              life: 1.4,
              damage: 9,
              fromPlayer: false,
            });
          }
          if (moveSpeed === 0) explicitState = 'combat';
        }
      } else if (npc.fleeTimer > 0) {
        npc.fleeTimer -= dt;
        npc.rotY = Math.atan2(-dx, -dz);
        moveSpeed = 5.4;
      } else {
        npc.wanderTimer -= dt;
        if (npc.wanderTimer <= 0) {
          npc.wanderTimer = 3 + Math.random() * 4;
          npc.wanderAngle += (Math.random() - 0.5) * 1.8;
        }
        npc.rotY = npc.wanderAngle;
        moveSpeed = 1.45;
      }

      if (moveSpeed > 0.1) {
        const res = this.resolveColliderPush(
          npc.x + Math.sin(npc.rotY) * moveSpeed * dt,
          npc.z + Math.cos(npc.rotY) * moveSpeed * dt,
          0.5,
        );
        if (res.hit) npc.wanderAngle += Math.PI * 0.7;
        npc.x = res.x;
        npc.z = res.z;
      }
      npc.y = groundHeightAt(npc.x, npc.z);
      npc.rig.group.position.set(npc.x, npc.y, npc.z);
      npc.rig.group.rotation.y = npc.rotY;

      // Throttle animation updates beyond 48m for mobile performance
      if (dist < 48 || (this.simFrameCount + npc.frameOffset) % 3 === 0) {
        const animDt = dist < 48 ? dt : dt * 3;
        npc.rig.animate(animDt, moveSpeed, true, false, false, 0, explicitState);
      }
    }
  }

  private stepProjectilesAndParticles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      let hit = p.life <= 0;
      if (!hit && p.fromPlayer) {
        for (const npc of this.npcs) {
          if (Math.hypot(npc.x - p.x, npc.z - p.z) < 0.85) {
            this.damageNpc(npc, p.damage);
            hit = true;
            break;
          }
        }
      } else if (!hit && !p.fromPlayer) {
        if (Math.hypot(this.playerX - p.x, this.playerZ - p.z) < 0.9) {
          this.health = Math.max(0, this.health - p.damage);
          this.camShake = Math.max(this.camShake, 0.25);
          hit = true;
        }
      }

      if (hit) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.vy -= 14 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y += pt.vy * dt;
      pt.mesh.position.z += pt.vz * dt;
      const s = Math.max(0.01, pt.life / pt.maxLife);
      pt.mesh.scale.setScalar(s);
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }

    if (this.health <= 0) {
      // Respawn at Bir Valley Teaching Hospital
      this.health = this.maxHealth;
      this.wantedHeat = 0;
      this.wantedLevel = 0;
      if (this.currentVehicle) this.exitVehicle();
      this.fastTravel(54, 48, 'Bir Valley Hospital');
      this.showBanner('Treated at Bir Valley Hospital — Wanted Cleared');
    }
  }

  private stepPoliceAndWanted(dt: number): void {
    const anyPursuit = this.wantedLevel > 0;
    gameAudio.updateSiren(anyPursuit, this.elapsed);

    if (this.policeHeli) {
      if (this.wantedLevel < 3) {
        this.scene.remove(this.policeHeli.rig.group);
        this.policeHeli = null;
      } else {
        const dx = this.playerX - this.policeHeli.x;
        const dz = this.playerZ - this.policeHeli.z;
        const dist = Math.hypot(dx, dz);
        this.policeHeli.rotY = Math.atan2(dx, dz);
        if (dist > 14) {
          this.policeHeli.x += (dx / dist) * 18 * dt;
          this.policeHeli.z += (dz / dist) * 18 * dt;
        }
        this.policeHeli.y = groundHeightAt(this.policeHeli.x, this.policeHeli.z) + 22;
        this.policeHeli.rig.group.position.set(this.policeHeli.x, this.policeHeli.y, this.policeHeli.z);
        this.policeHeli.rig.group.rotation.y = this.policeHeli.rotY;
        if (this.policeHeli.rig.mainRotor) this.policeHeli.rig.mainRotor.rotation.y += dt * 24;
        if (this.policeHeli.rig.tailRotor) this.policeHeli.rig.tailRotor.rotation.x += dt * 28;
      }
    }

    if (this.wantedHeat > 0) {
      // Check if player is out of sight of pursuing police
      const spotted = this.vehicles.some(
        (v) => v.aiState === 'pursuit' && Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 42,
      );
      const coolRate = spotted ? 0.6 : 5.5;
      this.wantedHeat = Math.max(0, this.wantedHeat - coolRate * dt);
      const nextLevel = Math.ceil(this.wantedHeat / 20);
      if (nextLevel < this.wantedLevel) {
        if (this.wantedLevel > this.progress.stats.maxWantedSurvived) {
          this.progress.stats.maxWantedSurvived = this.wantedLevel;
        }
        this.wantedLevel = nextLevel;
        if (this.wantedLevel === 0) {
          this.showBanner('Pursuit Evaded!');
        }
      }
    }
  }

  private stepMissionAndLandmarks(dt: number): void {
    // Landmark discovery
    for (const lm of LANDMARKS) {
      if (
        !this.progress.discoveredLandmarks.includes(lm.id) &&
        Math.hypot(lm.x - this.playerX, lm.z - this.playerZ) < 14
      ) {
        this.progress.discoveredLandmarks.push(lm.id);
        this.awardMoneyAndXp(lm.rewardMoney, lm.rewardXp);
        this.showBanner(`Discovered: ${lm.name} (+NPR ${lm.rewardMoney})`);
        gameAudio.playRewardChime();
      }
    }

    if (!this.activeMission) return;
    const step = this.activeMission.checkpoints[this.missionStepIdx];
    if (!step) return;

    if (this.missionTimeLeft !== null) {
      this.missionTimeLeft -= dt;
      if (this.missionTimeLeft <= 0) {
        this.showBanner(`Mission Failed: Time expired on ${this.activeMission.title}`);
        this.abortMission();
        return;
      }
    }

    const dist = Math.hypot(step.x - this.playerX, step.z - this.playerZ);
    if (dist <= step.radius) {
      if (step.dialogue) {
        this.showDialogue(step.dialogue.speaker, step.dialogue.line);
      }

      // Chapter 4 Police Heat Trigger on first checkpoint
      if (this.activeMission.id === 'm4_monsoon_escape' && this.missionStepIdx === 0) {
        this.addCrimeHeat(52);
      }

      this.missionStepIdx += 1;
      if (this.missionStepIdx >= this.activeMission.checkpoints.length) {
        const cleared = this.activeMission;
        this.activeMission = null;
        this.missionMarker.visible = false;
        this.missionTimeLeft = null;
        if (!this.progress.completedMissions.includes(cleared.id)) {
          this.progress.completedMissions.push(cleared.id);
        }
        this.progress.stats.missionsCleared += 1;
        this.awardMoneyAndXp(cleared.rewardMoney, cleared.rewardXp);
        this.showBanner(`Mission Complete! +NPR ${cleared.rewardMoney} · +${cleared.rewardXp} XP`);
        gameAudio.playRewardChime();
        this.callbacks.onMissionComplete(cleared);
      } else {
        const nextStep = this.activeMission.checkpoints[this.missionStepIdx];
        this.missionMarker.position.set(nextStep.x, groundHeightAt(nextStep.x, nextStep.z), nextStep.z);
        if (nextStep.timeLimitSec) this.missionTimeLeft = nextStep.timeLimitSec;
        if (nextStep.enemiesCount) this.spawnMissionEnemies(nextStep.x, nextStep.z, nextStep.enemiesCount);
      }
    }
  }

  private stepRemotePlayers(dt: number): void {
    for (const entry of this.remoteRigs.values()) {
      entry.x = THREE.MathUtils.damp(entry.x, entry.targetX, 10, dt);
      entry.y = THREE.MathUtils.damp(entry.y, entry.targetY, 10, dt);
      entry.z = THREE.MathUtils.damp(entry.z, entry.targetZ, 10, dt);
      entry.rotY = THREE.MathUtils.lerp(entry.rotY, entry.targetRotY, Math.min(1, dt * 10));

      if (entry.vehicleRig) {
        entry.rig.group.visible = true;
        entry.vehicleRig.group.position.set(entry.x, entry.y, entry.z);
        entry.vehicleRig.group.rotation.y = entry.rotY;
        entry.rig.animate(dt, 0, true, false, false, 0, 'drive');
      } else {
        entry.rig.group.visible = true;
        entry.rig.group.position.set(entry.x, entry.y, entry.z);
        entry.rig.group.rotation.y = entry.rotY;
        entry.rig.animate(dt, entry.speed, true, false, false, 0, entry.animState);
      }
    }
  }

  private stepThirdPersonCamera(dt: number): void {
    const target = this.currentVehicle;
    const tx = target ? target.x : this.playerX;
    const ty = (target ? target.y : this.playerY) + (target ? 1.5 : 1.45);
    const tz = target ? target.z : this.playerZ;

    // Gentle auto-align behind vehicle when moving and not manually dragging
    if (target && !this.isDraggingCam && Math.abs(target.speed) > 2) {
      const desiredYaw = target.rotY + Math.PI;
      let diff = desiredYaw - this.camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.camYaw += diff * Math.min(1, dt * 2.8);
    }

    const dist = target ? this.camDist + 1.8 : this.camDist;
    const horiz = Math.cos(this.camPitch) * dist;
    const vert = Math.sin(this.camPitch) * dist;

    const desiredPosX = tx + Math.sin(this.camYaw) * horiz;
    const desiredPosZ = tz + Math.cos(this.camYaw) * horiz;
    const groundAtCam = groundHeightAt(desiredPosX, desiredPosZ);
    const desiredPosY = Math.max(groundAtCam + 1.1, ty + vert);

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredPosX, 9, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, desiredPosY, 9, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredPosZ, 9, dt);

    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, tx, 12, dt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, ty, 12, dt);
    this.camLook.z = THREE.MathUtils.damp(this.camLook.z, tz, 12, dt);

    if (this.camShake > 0) {
      this.camShake = Math.max(0, this.camShake - dt * 1.8);
    }

    _vec3.set(
      (Math.random() - 0.5) * this.camShake,
      (Math.random() - 0.5) * this.camShake,
      (Math.random() - 0.5) * this.camShake,
    );
    this.camera.position.copy(this.camPos).add(_vec3);
    this.camera.lookAt(this.camLook);

    // Dynamic FOV widening with speed
    const speedRatio = target ? Math.abs(target.speed) / target.spec.maxSpeed : this.playerSpeed / 12;
    const targetFov = 60 + Math.min(14, speedRatio * 12);
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private pushHudSnapshot(): void {
    // Check interaction prompt
    let interactionPrompt: string | null = null;
    if (!this.currentVehicle) {
      for (const v of this.vehicles) {
        if (Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 4.5) {
          interactionPrompt = `Press F to enter ${v.spec.name}`;
          break;
        }
      }
      if (!interactionPrompt) {
        for (const npc of this.npcs) {
          if (npc.dialogue && npc.name && Math.hypot(npc.x - this.playerX, npc.z - this.playerZ) < 4.5) {
            interactionPrompt = `Press E to talk to ${npc.name}`;
            break;
          }
        }
      }
      if (!interactionPrompt) {
        for (const lm of LANDMARKS) {
          if (Math.hypot(lm.x - this.playerX, lm.z - this.playerZ) < 8.5) {
            interactionPrompt =
              lm.kind === 'garage'
                ? 'Press E to open Thamel Customs Garage'
                : lm.kind === 'hospital'
                  ? 'Press E for Hospital Medical Care'
                  : `Press E to inspect ${lm.name}`;
            break;
          }
        }
      }
    }

    const region = getRegionAt(this.playerX, this.playerZ);
    const blips: MinimapBlip[] = [];

    for (const v of this.vehicles) {
      if (v === this.currentVehicle) continue;
      if (Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 130) {
        blips.push({
          x: v.x,
          z: v.z,
          type: v.aiState === 'pursuit' ? 'police' : 'vehicle',
        });
      }
    }
    for (const lm of LANDMARKS) {
      blips.push({ x: lm.x, z: lm.z, type: 'landmark' });
    }
    for (const rp of this.remoteRigs.values()) {
      blips.push({ x: rp.x, z: rp.z, type: 'remote' });
    }

    let activeMissionHud: HudSnapshot['activeMission'] = null;
    if (this.activeMission) {
      const step = this.activeMission.checkpoints[this.missionStepIdx];
      if (step) {
        blips.push({ x: step.x, z: step.z, type: 'objective' });
        activeMissionHud = {
          id: this.activeMission.id,
          title: this.activeMission.title,
          objective: step.label,
          stepIndex: this.missionStepIdx + 1,
          totalSteps: this.activeMission.checkpoints.length,
          timeLeftSec: this.missionTimeLeft !== null ? Math.ceil(this.missionTimeLeft) : null,
          distanceM: Math.round(Math.hypot(step.x - this.playerX, step.z - this.playerZ)),
        };
      }
    } else if (this.waypoint) {
      blips.push({ x: this.waypoint.x, z: this.waypoint.z, type: 'objective' });
    }

    const weapSpec = WEAPON_CATALOG[this.currentWeapon];

    this.callbacks.onHudUpdate({
      health: Math.round(this.health),
      maxHealth: this.maxHealth,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      money: Math.round(this.progress.money),
      xp: Math.round(this.progress.xp),
      level: this.progress.level,
      wantedLevel: this.wantedLevel,
      wantedHeat: Math.round(this.wantedHeat),
      region,
      regionLabel: REGION_LABELS[region],
      weather: this.weather,
      timeOfDay: this.timeOfDay,
      fps: Math.round(this.fpsSamples),
      weapon: this.currentWeapon,
      ammo: this.ammoMap[this.currentWeapon],
      maxAmmo: weapSpec.clipSize,
      inVehicle: Boolean(this.currentVehicle),
      vehicleName: this.currentVehicle?.spec.name || '',
      vehicleCategory: this.currentVehicle?.spec.category || null,
      speedKmh: this.currentVehicle ? Math.round(Math.abs(this.currentVehicle.speed) * 3.6) : 0,
      fuel: this.currentVehicle ? Math.round(this.currentVehicle.fuel) : 100,
      vehicleHealth: this.currentVehicle ? Math.round(this.currentVehicle.health) : 100,
      interactionPrompt,
      activeMission: activeMissionHud,
      dialogue: this.currentDialogue,
      bannerMessage: this.currentBanner,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerRotY: this.currentVehicle ? this.currentVehicle.rotY : this.playerRotY,
      waypoint: this.waypoint,
      blips,
      isMultiplayer: this.isMultiplayer,
      remotePlayerCount: this.remoteRigs.size,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.textures.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}

export { _vec3b, _vec3c };
