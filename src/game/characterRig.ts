import * as THREE from 'three';
import type {
  CharacterAnimState,
  CharacterRole,
  PlayerCustomization,
  WeaponId,
} from './types';

let cachedDhakaTexture: THREE.CanvasTexture | null = null;
let cachedClothTexture: THREE.CanvasTexture | null = null;

function getDhakaPatternTexture(): THREE.CanvasTexture {
  if (cachedDhakaTexture) return cachedDhakaTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(0, 0, 128, 128);
  const colors = ['#f59e0b', '#f8fafc', '#0f172a', '#16a34a', '#dc2626'];
  for (let y = 0; y < 128; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      ctx.fillStyle = colors[((x + y) / 16) % colors.length];
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 16, y + 8);
      ctx.lineTo(x + 8, y + 16);
      ctx.lineTo(x, y + 8);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  cachedDhakaTexture = tex;
  return tex;
}

function getClothMicroTexture(): THREE.CanvasTexture {
  if (cachedClothTexture) return cachedClothTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, 64, 1);
  }
  for (let x = 0; x < 64; x += 2) {
    ctx.fillStyle = x % 4 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, 0, 1, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  cachedClothTexture = tex;
  return tex;
}

export interface ArticulatedCharacterRig {
  group: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Mesh;
  chestGroup: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  weaponMesh: THREE.Group;
  contactShadow: THREE.Mesh;
  setLodLevel: (lod: 0 | 1) => void;
  updateAppearance: (custom: PlayerCustomization, role?: CharacterRole) => void;
  setWeaponVisual: (weapon: WeaponId) => void;
  animate: (
    dt: number,
    speed: number,
    isGrounded: boolean,
    isCrouching: boolean,
    isSwimming: boolean,
    attackTimer: number,
    explicitState?: CharacterAnimState,
  ) => void;
}

export function createArticulatedCharacterRig(
  initialCustom: PlayerCustomization,
  shadowTex: THREE.Texture,
  role: CharacterRole = 'player',
): ArticulatedCharacterRig {
  const group = new THREE.Group();
  const rootScaleGroup = new THREE.Group();
  group.add(rootScaleGroup);

  const clothTex = getClothMicroTexture();
  const dhakaTex = getDhakaPatternTexture();

  // Calibrated PBR Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: initialCustom.skinTone,
    roughness: 0.56,
    metalness: 0.02,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: '#9f5b52',
    roughness: 0.45,
    metalness: 0.02,
  });
  const scleraMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.14,
    metalness: 0.0,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: '#2c1810',
    roughness: 0.08,
    metalness: 0.1,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: initialCustom.hairColor,
    roughness: 0.72,
    metalness: 0.06,
  });
  const outfitMat = new THREE.MeshStandardMaterial({
    color: initialCustom.outfitColor,
    map: clothTex,
    roughness: 0.78,
    metalness: 0.05,
  });
  const trimOutfitMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    map: clothTex,
    roughness: 0.74,
    metalness: 0.1,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    map: clothTex,
    roughness: 0.84,
    metalness: 0.04,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.44,
    metalness: 0.14,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.85,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.22,
    metalness: 0.88,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    roughness: 0.24,
    metalness: 0.9,
  });

  // Hips / Pelvis Pivot (y = 0.88)
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  rootScaleGroup.add(hips);

  const pelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.19, 0.2, 12),
    pantsMat,
  );
  pelvisMesh.scale.set(1.18, 1, 0.76);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Waist belt + metallic buckle
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.192, 0.192, 0.055, 12),
    shoeMat,
  );
  belt.scale.set(1.18, 1, 0.78);
  belt.position.y = 0.08;
  hips.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), goldMat);
  buckle.position.set(0, 0.08, 0.155);
  hips.add(buckle);

  // Spine & Chest
  const chestGroup = new THREE.Group();
  chestGroup.position.y = 0.1;
  hips.add(chestGroup);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.175, 0.48, 12),
    outfitMat,
  );
  torso.scale.set(1.18, 1, 0.74);
  torso.position.y = 0.24;
  torso.castShadow = true;
  chestGroup.add(torso);

  // Clothing Style Layers (Daura wrap lapel, Collar, Vest, Apron, Police Badge)
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.032, 8, 14),
    trimOutfitMat,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.49, 0.01);
  chestGroup.add(collar);

  const dauraLapel = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.42, 0.03),
    trimOutfitMat,
  );
  dauraLapel.position.set(0.04, 0.25, 0.16);
  dauraLapel.rotation.z = 0.24;
  chestGroup.add(dauraLapel);

  const dauraHem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.195, 0.23, 0.22, 12, 1, true),
    outfitMat,
  );
  dauraHem.scale.set(1.18, 1, 0.78);
  dauraHem.position.y = -0.05;
  chestGroup.add(dauraHem);

  const vestMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.232, 0.19, 0.42, 12),
    trimOutfitMat,
  );
  vestMesh.scale.set(1.2, 1, 0.78);
  vestMesh.position.y = 0.24;
  chestGroup.add(vestMesh);

  const badgeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 6), goldMat);
  badgeMesh.rotation.x = Math.PI / 2;
  badgeMesh.position.set(0.11, 0.34, 0.175);
  chestGroup.add(badgeMesh);

  const apronMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.56, 0.04),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', map: clothTex, roughness: 0.85 }),
  );
  apronMesh.position.set(0, 0.08, 0.165);
  chestGroup.add(apronMesh);

  // Neck + Articulated Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 10), skinMat);
  neck.position.y = 0.53;
  chestGroup.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.69, 0.01);
  chestGroup.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), skinMat);
  cranium.scale.set(0.92, 1.08, 0.98);
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.14), skinMat);
  jaw.position.set(0, -0.08, 0.03);
  head.add(jaw);

  // High-detail facial LOD0 group (eyes, eyelids, brows, nose, lips, ears)
  const faceDetailGroup = new THREE.Group();
  head.add(faceDetailGroup);

  // 3D Nose
  const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.075, 6), skinMat);
  noseBridge.rotation.x = Math.PI * 0.42;
  noseBridge.position.set(0, -0.01, 0.148);
  faceDetailGroup.add(noseBridge);

  // 3D Lips / Mouth (animates during Talk)
  const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.014, 0.022), lipMat);
  upperLip.position.set(0, -0.068, 0.132);
  const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.022), lipMat);
  lowerLip.position.set(0, -0.082, 0.13);
  faceDetailGroup.add(upperLip, lowerLip);

  // Eyes, Irises, Eyelids, Brows
  const eyelids: THREE.Mesh[] = [];
  for (const sx of [-0.048, 0.048]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), scleraMat);
    sclera.position.set(sx, 0.022, 0.122);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), irisMat);
    iris.position.set(sx, 0.022, 0.136);
    const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.024, 0.028), skinMat);
    eyelid.position.set(sx, 0.038, 0.13);
    eyelids.push(eyelid);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.012, 0.018), hairMat);
    brow.position.set(sx, 0.055, 0.132);
    brow.rotation.z = sx < 0 ? 0.08 : -0.08;
    faceDetailGroup.add(sclera, iris, eyelid, brow);
  }

  // 3D Ears
  for (const sx of [-0.135, 0.135]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), skinMat);
    ear.scale.set(0.42, 1.0, 0.72);
    ear.position.set(sx, 0.005, -0.01);
    faceDetailGroup.add(ear);
  }

  // 5 Sculpted 3D Hairstyles
  const hairShort = new THREE.Group();
  const shortCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat,
  );
  shortCap.scale.set(0.95, 1.08, 1.02);
  shortCap.position.set(0, 0.02, -0.01);
  const shortTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.18), hairMat);
  shortTop.position.set(0, 0.145, 0.02);
  hairShort.add(shortCap, shortTop);

  const hairLong = new THREE.Group();
  const longCap = shortCap.clone();
  const longBack = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.175, 0.34, 12), hairMat);
  longBack.position.set(0, -0.08, -0.055);
  hairLong.add(longCap, longBack);

  const hairTopKnot = new THREE.Group();
  hairTopKnot.add(shortCap.clone());
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), hairMat);
  bun.position.set(0, 0.17, -0.05);
  hairTopKnot.add(bun);

  const hairSlick = new THREE.Group();
  hairSlick.add(shortCap.clone());
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.22), hairMat);
  ridge.position.set(0, 0.135, -0.01);
  ridge.rotation.x = -0.15;
  hairSlick.add(ridge);

  const hairBraid = new THREE.Group();
  hairBraid.add(shortCap.clone());
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.044 - i * 0.005, 8, 8), hairMat);
    seg.position.set(0, -0.02 - i * 0.075, -0.14 - i * 0.012);
    hairBraid.add(seg);
  }
  head.add(hairShort, hairLong, hairTopKnot, hairSlick, hairBraid);

  // Accessories (Sunglasses, Dhaka Topi, Police Cap, Scarf, Backpack)
  const sunglassesGroup = new THREE.Group();
  const sgBridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.02), metalMat);
  sgBridge.position.set(0, 0.028, 0.146);
  const sgLensMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.08, metalness: 0.85 });
  for (const sx of [-0.044, 0.044]) {
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.032, 0.016), sgLensMat);
    lens.position.set(sx, 0.024, 0.148);
    sunglassesGroup.add(lens);
  }
  sunglassesGroup.add(sgBridge);
  head.add(sunglassesGroup);

  const dhakaTopi = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.154, 0.11, 14),
    new THREE.MeshStandardMaterial({ map: dhakaTex, roughness: 0.78 }),
  );
  dhakaTopi.position.set(0, 0.14, -0.01);
  dhakaTopi.rotation.x = -0.08;
  head.add(dhakaTopi);

  const policeCapGroup = new THREE.Group();
  const capCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.162, 0.148, 0.09, 14),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 }),
  );
  capCrown.position.set(0, 0.14, -0.01);
  const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.12), shoeMat);
  capVisor.position.set(0, 0.1, 0.14);
  capVisor.rotation.x = 0.2;
  const capBadge = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), goldMat);
  capBadge.position.set(0, 0.14, 0.15);
  policeCapGroup.add(capCrown, capVisor, capBadge);
  head.add(policeCapGroup);

  const scarfGroup = new THREE.Group();
  const scarfMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', map: clothTex, roughness: 0.88 });
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.042, 8, 14), scarfMat);
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.set(0, 0.49, 0.01);
  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.03), scarfMat);
  scarfTail.position.set(0.07, 0.34, 0.15);
  scarfGroup.add(scarfRing, scarfTail);
  chestGroup.add(scarfGroup);

  const backpackGroup = new THREE.Group();
  const packMat = new THREE.MeshStandardMaterial({ color: '#334155', map: clothTex, roughness: 0.82 });
  const packMain = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.14), packMat);
  packMain.position.set(0, 0.25, -0.19);
  packMain.castShadow = true;
  const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.05), trimOutfitMat);
  packPocket.position.set(0, 0.18, -0.27);
  backpackGroup.add(packMain, packPocket);
  chestGroup.add(backpackGroup);

  // Arms with Elbows, Palms, Thumbs & 4 Articulated Fingers
  const handDetailGroups: THREE.Group[] = [];
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.29, 0.42, 0);
    chestGroup.add(shoulder);

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.056, 0.28, 10),
      outfitMat,
    );
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Group();
    forearm.position.y = -0.28;
    shoulder.add(forearm);

    const lowerArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.044, 0.26, 10),
      skinMat,
    );
    lowerArm.position.y = -0.13;
    lowerArm.castShadow = true;
    forearm.add(lowerArm);

    // Sculpted Hand + Fingers
    const hand = new THREE.Group();
    hand.position.y = -0.27;
    forearm.add(hand);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.075), skinMat);
    palm.position.y = -0.04;
    hand.add(palm);

    const fingersGroup = new THREE.Group();
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.052, 6), skinMat);
      finger.position.set(0, -0.1, -0.025 + f * 0.017);
      fingersGroup.add(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.044, 6), skinMat);
    thumb.position.set(-side * 0.024, -0.055, 0.04);
    thumb.rotation.x = 0.5;
    fingersGroup.add(thumb);
    hand.add(fingersGroup);
    handDetailGroups.push(fingersGroup);

    return { shoulder, forearm, hand };
  };

  const leftArmObj = makeArm(-1);
  const rightArmObj = makeArm(1);

  // Weapon mount on right hand
  const weaponMesh = new THREE.Group();
  weaponMesh.position.set(0, -0.05, 0.05);
  rightArmObj.hand.add(weaponMesh);

  const bladeGroup = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.07, 0.44),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.18 }),
  );
  blade.position.z = 0.22;
  bladeGroup.add(blade);

  const gunGroup = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.075, 0.42),
    new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.24 }),
  );
  barrel.position.z = 0.22;
  gunGroup.add(barrel);
  weaponMesh.add(bladeGroup, gunGroup);

  // Legs with Knees, Calves, and Sculpted Shoes
  const makeLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.125, -0.04, 0);
    hips.add(hipPivot);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.072, 0.42, 10),
      pantsMat,
    );
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.42;
    hipPivot.add(shinPivot);

    const calf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.052, 0.36, 10),
      pantsMat,
    );
    calf.position.y = -0.18;
    calf.castShadow = true;
    shinPivot.add(calf);

    // Sculpted Shoe (upper + midsole + toe cap)
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.39, 0.035);
    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.22), shoeMat);
    shoeUpper.castShadow = true;
    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.028, 0.232), soleMat);
    shoeSole.position.y = -0.044;
    const bootCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.06, 0.08, 10), shoeMat);
    bootCuff.position.set(0, 0.055, -0.03);
    shoeGroup.add(shoeUpper, shoeSole, bootCuff);
    shinPivot.add(shoeGroup);

    return { hipPivot, shinPivot, bootCuff };
  };

  const leftLegObj = makeLeg(-1);
  const rightLegObj = makeLeg(1);

  // Ground Contact Shadow
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 1.05),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  group.add(contactShadow);

  const setWeaponVisual = (w: WeaponId) => {
    bladeGroup.visible = w === 'khukuri';
    gunGroup.visible = w === 'pistol' || w === 'carbine';
    gunGroup.scale.set(1, 1, w === 'carbine' ? 1.45 : 0.78);
  };
  setWeaponVisual('fists');

  const setLodLevel = (lod: 0 | 1) => {
    faceDetailGroup.visible = lod === 0;
    for (const h of handDetailGroups) h.visible = lod === 0;
  };

  const updateAppearance = (next: PlayerCustomization, activeRole: CharacterRole = role) => {
    skinMat.color.set(next.skinTone);
    hairMat.color.set(next.hairColor);

    // Role overrides for police/security/shopkeeper/enemy uniforms
    if (activeRole === 'police') {
      outfitMat.color.set('#1e3a8a');
      pantsMat.color.set('#0f172a');
      trimOutfitMat.color.set('#0f172a');
    } else if (activeRole === 'security') {
      outfitMat.color.set('#334155');
      trimOutfitMat.color.set('#eab308');
      pantsMat.color.set('#111827');
    } else if (activeRole === 'enemy') {
      outfitMat.color.set('#7f1d1d');
      trimOutfitMat.color.set('#18181b');
      pantsMat.color.set('#18181b');
    } else {
      outfitMat.color.set(next.outfitColor);
      pantsMat.color.set(next.clothingStyle === 'formal_blazer' ? '#0f172a' : '#1e293b');
      trimOutfitMat.color.set(next.clothingStyle === 'nepali_daura' ? '#f59e0b' : '#1e293b');
    }

    // Gender & Body proportions
    const fem = next.gender === 'female';
    const hScale = THREE.MathUtils.clamp(next.heightScale || 1, 0.9, 1.12);
    const bScale = THREE.MathUtils.clamp(next.buildScale || 1, 0.88, 1.15);
    rootScaleGroup.scale.set(bScale, hScale, bScale);
    torso.scale.set(fem ? 0.98 : 1.22, 1, fem ? 0.7 : 0.76);
    pelvisMesh.scale.set(fem ? 1.22 : 1.12, 1, 0.78);
    leftArmObj.shoulder.position.x = fem ? -0.25 : -0.3;
    rightArmObj.shoulder.position.x = fem ? 0.25 : 0.3;

    // Face shape
    if (next.faceStyle === 'angular') {
      cranium.scale.set(0.88, 1.12, 0.96);
      jaw.scale.set(0.92, 1.05, 1.04);
    } else if (next.faceStyle === 'broad') {
      cranium.scale.set(1.02, 1.04, 1.0);
      jaw.scale.set(1.12, 1.0, 1.0);
    } else {
      cranium.scale.set(0.92, 1.08, 0.98);
      jaw.scale.set(1.0, 1.0, 1.0);
    }

    // Hairstyles
    hairShort.visible = next.hairStyle === 'short_taper';
    hairLong.visible = next.hairStyle === 'layered_long';
    hairTopKnot.visible = next.hairStyle === 'top_knot';
    hairSlick.visible = next.hairStyle === 'slick_back';
    hairBraid.visible = next.hairStyle === 'braid';

    // Clothing Styles
    dauraLapel.visible = next.clothingStyle === 'nepali_daura';
    dauraHem.visible = next.clothingStyle === 'nepali_daura';
    vestMesh.visible = next.clothingStyle === 'trekking_vest' || activeRole === 'security';
    badgeMesh.visible = activeRole === 'police' || activeRole === 'security';
    apronMesh.visible = activeRole === 'shopkeeper';

    // Shoes
    const isBoots = next.shoeStyle === 'hiking_boots';
    const isSneakers = next.shoeStyle === 'sneakers';
    shoeMat.color.set(next.shoeStyle === 'dress_shoes' ? '#1c1917' : isBoots ? '#451a03' : '#1e293b');
    soleMat.color.set(isSneakers ? '#f8fafc' : '#1c1917');
    leftLegObj.bootCuff.visible = isBoots;
    rightLegObj.bootCuff.visible = isBoots;

    // Accessories
    sunglassesGroup.visible = next.accessory === 'sunglasses';
    dhakaTopi.visible =
      (next.accessory === 'dhaka_topi' || activeRole === 'shopkeeper') && activeRole !== 'police';
    policeCapGroup.visible = activeRole === 'police';
    scarfGroup.visible = next.accessory === 'scarf';
    backpackGroup.visible = next.accessory === 'backpack' && activeRole === 'player';
  };

  updateAppearance(initialCustom, role);

  let phase = Math.random() * 6.28;
  let blinkTimer = 1.8 + Math.random() * 2.5;

  const animate = (
    dt: number,
    speed: number,
    isGrounded: boolean,
    isCrouching: boolean,
    isSwimming: boolean,
    attackTimer: number,
    explicitState?: CharacterAnimState,
  ) => {
    phase += dt;

    // Natural Blink Cycle
    blinkTimer -= dt;
    const isBlinking = blinkTimer < 0 && blinkTimer > -0.14;
    if (blinkTimer < -0.14) blinkTimer = 2.4 + Math.random() * 3.0;
    for (const lid of eyelids) {
      lid.scale.y = isBlinking ? 1.85 : 0.45;
      lid.position.y = isBlinking ? 0.024 : 0.04;
    }

    const state: CharacterAnimState =
      explicitState ||
      (isSwimming
        ? 'swim'
        : !isGrounded
          ? 'jump'
          : isCrouching
            ? 'crouch'
            : attackTimer > 0
              ? 'combat'
              : speed > 8.0
                ? 'sprint'
                : speed > 4.2
                  ? 'run'
                  : speed > 0.35
                    ? 'walk'
                    : 'idle');

    const k = Math.min(1, dt * 13);

    // Default target angles
    let hipY = 0.88;
    let chestPitch = 0;
    let lShoulderX = 0;
    let rShoulderX = 0;
    let lForearmX = -0.12;
    let rForearmX = -0.12;
    let lHipX = 0;
    let rHipX = 0;
    let lShinX = 0;
    let rShinX = 0;

    if (state === 'drive' || state === 'sit') {
      hipY = 0.46;
      chestPitch = state === 'drive' ? 0.14 : 0.04;
      lHipX = -1.45;
      rHipX = -1.45;
      lShinX = 1.35;
      rShinX = 1.35;
      if (state === 'drive') {
        lShoulderX = -1.05;
        rShoulderX = -1.05;
        lForearmX = -0.45;
        rForearmX = -0.45;
      } else {
        lShoulderX = -0.35;
        rShoulderX = -0.35;
        lForearmX = -0.5;
        rForearmX = -0.5;
      }
    } else if (state === 'swim') {
      hipY = 0.72;
      chestPitch = 1.15;
      lShoulderX = Math.sin(phase * 6.5) * 1.1 - 1.4;
      rShoulderX = -Math.sin(phase * 6.5) * 1.1 - 1.4;
      lHipX = Math.cos(phase * 6.5) * 0.45;
      rHipX = -Math.cos(phase * 6.5) * 0.45;
    } else if (state === 'climb') {
      chestPitch = 0.18;
      lShoulderX = -1.6 + Math.sin(phase * 8) * 0.6;
      rShoulderX = -1.6 - Math.sin(phase * 8) * 0.6;
      lHipX = -0.4 - Math.sin(phase * 8) * 0.5;
      rHipX = -0.4 + Math.sin(phase * 8) * 0.5;
      lShinX = 0.7;
      rShinX = 0.7;
    } else if (state === 'jump' || state === 'fall') {
      lHipX = -0.45;
      rHipX = 0.25;
      lShinX = 0.55;
      rShinX = 0.2;
      lShoulderX = -0.65;
      rShoulderX = -0.55;
    } else if (state === 'crouch') {
      hipY = 0.64;
      chestPitch = 0.22;
      lHipX = -0.7;
      rHipX = -0.7;
      lShinX = 1.1;
      rShinX = 1.1;
    } else if (state === 'walk' || state === 'run' || state === 'sprint') {
      const freq = state === 'sprint' ? 12.5 : state === 'run' ? 9.5 : 6.4;
      const amp = state === 'sprint' ? 0.92 : state === 'run' ? 0.72 : 0.48;
      const s = Math.sin(phase * freq);
      const c = Math.cos(phase * freq);
      chestPitch = state === 'sprint' ? 0.2 : state === 'run' ? 0.12 : 0.04;
      lHipX = s * amp;
      rHipX = -s * amp;
      lShinX = Math.max(0.05, -c * 0.75 + 0.25);
      rShinX = Math.max(0.05, c * 0.75 + 0.25);
      lShoulderX = -s * amp * 0.8;
      rShoulderX = s * amp * 0.8;
      lForearmX = -0.45;
      rForearmX = -0.45;
    } else if (state === 'talk') {
      rShoulderX = -0.55 + Math.sin(phase * 4.5) * 0.25;
      rForearmX = -0.85;
      lShoulderX = -0.25 + Math.cos(phase * 3.2) * 0.12;
      lForearmX = -0.55;
      lowerLip.position.y = -0.082 - Math.abs(Math.sin(phase * 11)) * 0.012;
    } else if (state === 'interact') {
      rShoulderX = -1.1;
      rForearmX = -0.35;
    } else {
      // Idle natural breathing
      hipY = 0.88 + Math.sin(phase * 2.1) * 0.008;
      chestPitch = Math.sin(phase * 2.1) * 0.02;
      lowerLip.position.y = -0.082;
    }

    if (attackTimer > 0 || state === 'combat') {
      rShoulderX = -1.45 + Math.sin(attackTimer * 24) * 0.55;
      rForearmX = -0.25;
    }

    hips.position.y = THREE.MathUtils.lerp(hips.position.y, hipY, k);
    chestGroup.rotation.x = THREE.MathUtils.lerp(chestGroup.rotation.x, chestPitch, k);
    leftArmObj.shoulder.rotation.x = THREE.MathUtils.lerp(leftArmObj.shoulder.rotation.x, lShoulderX, k);
    rightArmObj.shoulder.rotation.x = THREE.MathUtils.lerp(rightArmObj.shoulder.rotation.x, rShoulderX, k);
    leftArmObj.forearm.rotation.x = THREE.MathUtils.lerp(leftArmObj.forearm.rotation.x, lForearmX, k);
    rightArmObj.forearm.rotation.x = THREE.MathUtils.lerp(rightArmObj.forearm.rotation.x, rForearmX, k);
    leftLegObj.hipPivot.rotation.x = THREE.MathUtils.lerp(leftLegObj.hipPivot.rotation.x, lHipX, k);
    rightLegObj.hipPivot.rotation.x = THREE.MathUtils.lerp(rightLegObj.hipPivot.rotation.x, rHipX, k);
    leftLegObj.shinPivot.rotation.x = THREE.MathUtils.lerp(leftLegObj.shinPivot.rotation.x, lShinX, k);
    rightLegObj.shinPivot.rotation.x = THREE.MathUtils.lerp(rightLegObj.shinPivot.rotation.x, rShinX, k);
  };

  return {
    group,
    hips,
    torso,
    chestGroup,
    head,
    leftArm: leftArmObj.shoulder,
    rightArm: rightArmObj.shoulder,
    leftForearm: leftArmObj.forearm,
    rightForearm: rightArmObj.forearm,
    leftLeg: leftLegObj.hipPivot,
    rightLeg: rightLegObj.hipPivot,
    leftShin: leftLegObj.shinPivot,
    rightShin: rightLegObj.shinPivot,
    weaponMesh,
    contactShadow,
    setLodLevel,
    updateAppearance,
    setWeaponVisual,
    animate,
  };
}
