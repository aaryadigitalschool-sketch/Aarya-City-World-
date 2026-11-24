import * as THREE from 'three';
import {
  createArticulatedCharacterRig,
  type ArticulatedCharacterRig,
} from './characterRig';
import type {
  CharacterRole,
  PlayerCustomization,
  VehicleSpec,
} from './types';

export type CharacterRig = ArticulatedCharacterRig;

export interface VehicleRig {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  wheels: THREE.Group[];
  frontWheelPivots: THREE.Group[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  driverMount: THREE.Group;
  passengerMount: THREE.Group;
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  mainRotor?: THREE.Group;
  tailRotor?: THREE.Group;
  contactShadow: THREE.Mesh;
  setColor: (hex: string) => void;
  setLights: (headlightsOn: boolean, braking: boolean) => void;
}

export function createCharacterRig(
  custom: PlayerCustomization,
  shadowTex: THREE.Texture,
  role: CharacterRole = 'player',
): CharacterRig {
  return createArticulatedCharacterRig(custom, shadowTex, role);
}

export function createVehicleRig(
  spec: VehicleSpec,
  colorHex: string,
  shadowTex: THREE.Texture,
  isSoftwareGl: boolean,
): VehicleRig {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    metalness: 0.65,
    roughness: 0.24,
    clearcoat: isSoftwareGl ? 0.3 : 0.95,
    clearcoatRoughness: 0.12,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.72,
    metalness: 0.25,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.2,
    metalness: 0.92,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0f172a',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.88,
    metalness: 0.05,
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fef08a',
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: '#991b1b',
    emissive: '#ef4444',
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });

  const wheels: THREE.Group[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];

  const { length, width, height, category } = spec;
  const wheelRadius = category === 'bus' || category === 'truck' ? 0.46 : category === 'motorcycle' || category === 'scooter' ? 0.32 : 0.36;
  const wheelWidth = category === 'motorcycle' || category === 'scooter' ? 0.16 : 0.24;

  const makeWheel = (x: number, y: number, z: number, isFront: boolean) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const spinGroup = new THREE.Group();

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16),
      tireMat,
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.56, wheelRadius * 0.56, wheelWidth + 0.02, 12),
      chromeMat,
    );
    rim.rotation.z = Math.PI / 2;

    spinGroup.add(tire, rim);
    pivot.add(spinGroup);
    group.add(pivot);
    wheels.push(spinGroup);
    if (isFront) frontWheelPivots.push(pivot);
  };

  let bodyMesh: THREE.Mesh;
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  let mainRotor: THREE.Group | undefined;
  let tailRotor: THREE.Group | undefined;

  if (category === 'helicopter') {
    bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.85, height * 0.55, length * 0.52),
      paintMat,
    );
    bodyMesh.position.set(0, 1.35, 0.35);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    const noseGlass = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.78, height * 0.44, length * 0.22),
      glassMat,
    );
    noseGlass.position.set(0, 1.32, length * 0.3);
    group.add(noseGlass);

    const tailBoom = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.34, length * 0.5),
      paintMat,
    );
    tailBoom.position.set(0, 1.42, -length * 0.35);
    tailBoom.castShadow = true;
    group.add(tailBoom);

    // Landing skids
    for (const sx of [-0.9, 0.9]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.8), chromeMat);
      skid.position.set(sx, 0.08, 0.2);
      group.add(skid);
      for (const sz of [-0.7, 0.9]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), chromeMat);
        strut.position.set(sx * 0.82, 0.42, sz);
        group.add(strut);
      }
    }

    mainRotor = new THREE.Group();
    mainRotor.position.set(0, 2.38, 0.35);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.04, 0.24), trimMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 7.2), trimMat);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 8), chromeMat);
    mast.position.y = -0.2;
    mainRotor.add(blade1, blade2, mast);
    group.add(mainRotor);

    tailRotor = new THREE.Group();
    tailRotor.position.set(0.24, 1.56, -length * 0.58);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.12), trimMat);
    tailRotor.add(tb);
    group.add(tailRotor);
  } else if (category === 'boat') {
    bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.68, length), paintMat);
    bodyMesh.position.set(0, 0.5, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    const bow = new THREE.Mesh(new THREE.ConeGeometry(width * 0.52, 1.4, 4), paintMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.54, length * 0.5 + 0.5);
    group.add(bow);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.42, 1.1), glassMat);
    windshield.position.set(0, 1.0, 0.4);
    group.add(windshield);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.18, length * 0.9), trimMat);
    stripe.position.set(0, 0.65, 0);
    group.add(stripe);
  } else if (category === 'motorcycle' || category === 'scooter') {
    bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, length * 0.68), paintMat);
    bodyMesh.position.set(0, 0.68, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.72), trimMat);
    seat.position.set(0, 0.92, -0.18);
    group.add(seat);

    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 0.12), chromeMat);
    fork.position.set(0, 0.78, length * 0.34);
    fork.rotation.x = -0.35;
    group.add(fork);

    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.08), chromeMat);
    handleBar.position.set(0, 1.08, length * 0.28);
    group.add(handleBar);

    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.08), headMat);
    hl.position.set(0, 0.92, length * 0.4);
    group.add(hl);
    headlights.push(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.06), tailMat);
    tl.position.set(0, 0.82, -length * 0.36);
    group.add(tl);
    taillights.push(tl);

    makeWheel(0, wheelRadius, length * 0.34, true);
    makeWheel(0, wheelRadius, -length * 0.34, false);
  } else {
    // Ground 4-wheel vehicles (cars, SUVs, pickups, buses, trucks, police)
    const chassisHeight = category === 'bus' ? 1.9 : category === 'truck' ? 1.45 : height * 0.48;
    const chassisY = wheelRadius + chassisHeight * 0.5 + 0.05;

    bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, chassisHeight, length),
      paintMat,
    );
    bodyMesh.position.set(0, chassisY, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Cabin / Greenhouse
    const cabinLen =
      category === 'bus'
        ? length * 0.92
        : category === 'pickup'
          ? length * 0.38
          : category === 'truck'
            ? length * 0.32
            : length * 0.52;
    const cabinZ =
      category === 'pickup'
        ? length * 0.12
        : category === 'truck'
          ? length * 0.28
          : category === 'bus'
            ? 0
            : -length * 0.04;
    const cabinH = category === 'bus' ? 0.72 : category === 'truck' ? 0.95 : height * 0.42;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.88, cabinH, cabinLen),
      glassMat,
    );
    cabin.position.set(0, chassisY + chassisHeight * 0.5 + cabinH * 0.45, cabinZ);
    cabin.castShadow = true;
    group.add(cabin);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.86, 0.08, cabinLen * 0.94),
      paintMat,
    );
    roof.position.set(0, chassisY + chassisHeight * 0.5 + cabinH * 0.92, cabinZ);
    group.add(roof);

    if (category === 'truck') {
      const cargoBox = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.96, 1.9, length * 0.56),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.65, metalness: 0.15 }),
      );
      cargoBox.position.set(0, chassisY + 1.15, -length * 0.2);
      cargoBox.castShadow = true;
      group.add(cargoBox);
    }

    if (category === 'sports' || category === 'supercar') {
      const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.9, 0.08, 0.28),
        trimMat,
      );
      spoiler.position.set(0, chassisY + chassisHeight * 0.68, -length * 0.44);
      group.add(spoiler);
    }

    if (category === 'police') {
      const whiteDoor = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.03, chassisHeight * 0.78, length * 0.42),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 }),
      );
      whiteDoor.position.set(0, chassisY, 0);
      group.add(whiteDoor);

      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.24), trimMat);
      barBase.position.set(0, chassisY + chassisHeight * 0.5 + cabinH + 0.05, cabinZ);
      group.add(barBase);

      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.1, 0.22),
        new THREE.MeshStandardMaterial({
          color: '#ef4444',
          emissive: '#ef4444',
          emissiveIntensity: 1.5,
        }),
      );
      sirenRed.position.set(-0.3, chassisY + chassisHeight * 0.5 + cabinH + 0.1, cabinZ);
      group.add(sirenRed);

      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.1, 0.22),
        new THREE.MeshStandardMaterial({
          color: '#3b82f6',
          emissive: '#3b82f6',
          emissiveIntensity: 1.5,
        }),
      );
      sirenBlue.position.set(0.3, chassisY + chassisHeight * 0.5 + cabinH + 0.1, cabinZ);
      group.add(sirenBlue);
    }

    // Bumpers & Grille
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.96, 0.2, 0.18),
      trimMat,
    );
    frontBumper.position.set(0, wheelRadius + 0.12, length * 0.5);
    group.add(frontBumper);

    const rearBumper = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.96, 0.2, 0.18),
      trimMat,
    );
    rearBumper.position.set(0, wheelRadius + 0.12, -length * 0.5);
    group.add(rearBumper);

    // Headlights & Taillights
    for (const sx of [-width * 0.34, width * 0.34]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), headMat.clone());
      hl.position.set(sx, chassisY + 0.04, length * 0.505);
      group.add(hl);
      headlights.push(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), tailMat.clone());
      tl.position.set(sx, chassisY + 0.04, -length * 0.505);
      group.add(tl);
      taillights.push(tl);
    }

    const axleX = width * 0.47;
    const frontZ = length * 0.32;
    const rearZ = -length * 0.32;
    makeWheel(-axleX, wheelRadius, frontZ, true);
    makeWheel(axleX, wheelRadius, frontZ, true);
    makeWheel(-axleX, wheelRadius, rearZ, false);
    makeWheel(axleX, wheelRadius, rearZ, false);
  }

  // Contact Shadow
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.45, length * 1.28),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.62,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.04;
  group.add(contactShadow);

  const driverMount = new THREE.Group();
  const passengerMount = new THREE.Group();
  if (category === 'motorcycle' || category === 'scooter') {
    driverMount.position.set(0, 0.52, -0.1);
    passengerMount.position.set(0, 0.54, -0.52);
  } else if (category === 'helicopter') {
    driverMount.position.set(-0.35, 0.75, 0.65);
    passengerMount.position.set(0.35, 0.75, 0.65);
  } else if (category === 'boat') {
    driverMount.position.set(-0.32, 0.42, 0.1);
    passengerMount.position.set(0.32, 0.42, 0.1);
  } else {
    driverMount.position.set(-width * 0.22, 0.52, 0.15);
    passengerMount.position.set(width * 0.22, 0.52, 0.15);
  }
  group.add(driverMount, passengerMount);

  const setColor = (hex: string) => {
    paintMat.color.set(hex);
  };

  const setLights = (headlightsOn: boolean, braking: boolean) => {
    for (const hl of headlights) {
      (hl.material as THREE.MeshStandardMaterial).emissiveIntensity = headlightsOn ? 2.1 : 0.25;
    }
    for (const tl of taillights) {
      (tl.material as THREE.MeshStandardMaterial).emissiveIntensity = braking
        ? 2.6
        : headlightsOn
          ? 1.1
          : 0.35;
    }
  };

  return {
    group,
    bodyMesh,
    wheels,
    frontWheelPivots,
    headlights,
    taillights,
    driverMount,
    passengerMount,
    sirenRed,
    sirenBlue,
    mainRotor,
    tailRotor,
    contactShadow,
    setColor,
    setLights,
  };
}

export function createPagodaTemple(brickTex: THREE.Texture): THREE.Group {
  const temple = new THREE.Group();

  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#78716c',
    roughness: 0.85,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.82,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#7c2d12',
    roughness: 0.55,
    metalness: 0.2,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    roughness: 0.2,
    metalness: 0.92,
  });

  // 3-step stone plinth
  for (let i = 0; i < 3; i++) {
    const size = 14 - i * 1.8;
    const step = new THREE.Mesh(new THREE.BoxGeometry(size, 0.7, size), plinthMat);
    step.position.y = 0.35 + i * 0.7;
    step.castShadow = true;
    step.receiveShadow = true;
    temple.add(step);
  }

  // 3 Pagoda tiers
  const tiers = [
    { w: 7.4, h: 4.0, roofW: 11.2, y: 2.1 },
    { w: 5.4, h: 3.1, roofW: 8.4, y: 6.4 },
    { w: 3.6, h: 2.4, roofW: 5.8, y: 9.8 },
  ];

  for (const t of tiers) {
    const core = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.w), brickMat);
    core.position.y = t.y + t.h * 0.5;
    core.castShadow = true;
    core.receiveShadow = true;
    temple.add(core);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(t.roofW * 0.72, 1.65, 4),
      roofMat,
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = t.y + t.h + 0.6;
    roof.castShadow = true;
    temple.add(roof);
  }

  // Gilded Gajur pinnacle
  const gajur = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 12), goldMat);
  gajur.position.y = 14.1;
  gajur.castShadow = true;
  temple.add(gajur);

  return temple;
}
