import * as THREE from 'three';
import { createPagodaTemple } from './models';
import type { ProceduralTextureSet } from './textures';
import { LANDMARKS, type RegionId } from './types';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface TrafficSignalNode {
  x: number;
  z: number;
  axis: 'x' | 'z';
  redBulb: THREE.Mesh;
  greenBulb: THREE.Mesh;
}

export interface LandmarkBeacon {
  id: string;
  x: number;
  z: number;
  ring: THREE.Mesh;
}

export interface WorldHandles {
  colliders: BoxCollider[];
  trafficLights: TrafficSignalNode[];
  streetLampBulbs: THREE.MeshStandardMaterial;
  waterMesh: THREE.Mesh;
  landmarkBeacons: LandmarkBeacon[];
  roadNodes: Array<{ x: number; z: number }>;
  updateEnvironment: (timeOfDay: number, dt: number) => void;
}

export const WORLD_RADIUS = 290;
export const WATER_LEVEL = -1.1;

/**
 * Continuous heightfield across Kathmandu basin, Pokhara lake depression,
 * flat Terai southern plain, and climbing Himalayan northern ridges.
 */
export function groundHeightAt(x: number, z: number): number {
  // Keep central road corridors and Kathmandu basin flat for smooth driving
  const distFromCenter = Math.hypot(x, z);

  // Pokhara Lake Basin (West: around -185, -35)
  const lakeDist = Math.hypot(x + 195, z + 35);
  if (lakeDist < 42) {
    const t = Math.max(0, 1 - lakeDist / 42);
    return -3.4 * t * t;
  }

  // Himalayan Northern Ridge (z < -95)
  if (z < -95) {
    const climb = Math.min(1, (-z - 95) / 145);
    const baseRise = climb * climb * 26;
    // Carve switchback mountain road corridor near x in [-22, 6]
    const roadCenter = Math.sin((-z - 95) * 0.045) * 14 - 8;
    const distToRoad = Math.abs(x - roadCenter);
    const roadBlend = Math.min(1, Math.max(0, (distToRoad - 5) / 12));
    const ridgeNoise =
      (Math.sin(x * 0.06) * Math.cos(z * 0.05) + 1) * 4.5 * roadBlend;
    return baseRise + ridgeNoise;
  }

  // Gentle rural hills on outer East/West edges outside main plazas
  if (distFromCenter > 155 && z > -95 && z < 120) {
    const hillFactor = Math.min(1, (distFromCenter - 155) / 110);
    // Keep Skyport runway flat (x: 110..175, z: -15..35)
    if (x > 95 && x < 190 && z > -25 && z < 45) return 0;
    // Keep Pokhara promenade flat
    if (x < -120 && x > -175 && z > -70 && z < 10) return 0;
    return hillFactor * (Math.sin(x * 0.04) * Math.cos(z * 0.04) + 1) * 3.8;
  }

  return 0;
}

export function getRegionAt(x: number, z: number): RegionId {
  if (z < -100) return 'himalaya';
  if (z > 110) return 'terai';
  if (x < -105) return 'pokhara';
  if (Math.hypot(x, z) > 165) return 'rural';
  return 'kathmandu';
}

export function buildAaryaWorld(
  scene: THREE.Scene,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): WorldHandles {
  const colliders: BoxCollider[] = [];
  const trafficLights: TrafficSignalNode[] = [];
  const landmarkBeacons: LandmarkBeacon[] = [];

  // 1. Deformed Continuous Valley Terrain (extends well past playable boundary)
  const terrainGeo = new THREE.PlaneGeometry(780, 780, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const _c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let y = groundHeightAt(x, z);

    // Outer natural mountain ring past WORLD_RADIUS so world never ends in an empty void
    const edgeDist = Math.hypot(x, z);
    if (edgeDist > WORLD_RADIUS) {
      const outer = (edgeDist - WORLD_RADIUS) / 85;
      y += outer * outer * 38 + Math.abs(Math.sin(x * 0.05) * Math.cos(z * 0.05)) * 12;
    }

    pos.setY(i, y);

    if (y > 19) {
      _c.set('#f1f5f9'); // Snowline
    } else if (y > 10) {
      _c.set('#64748b'); // Alpine rock
    } else if (z > 110) {
      _c.set('#7c8c42'); // Terai warm farmland
    } else if (y < -0.5) {
      _c.set('#927c5c'); // Lakebed sand
    } else {
      _c.set('#4c6b3c'); // Kathmandu valley green
    }
    colors[i * 3] = _c.r;
    colors[i * 3 + 1] = _c.g;
    colors[i * 3 + 2] = _c.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.terrainGrass,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 2. Phewa Mirror Lake (Pokhara West)
  const waterGeo = new THREE.CircleGeometry(46, 36);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: '#0e7490',
    roughness: 0.14,
    metalness: 0.18,
    clearcoat: isSoftwareGl ? 0.2 : 0.9,
    transparent: true,
    opacity: 0.88,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-195, WATER_LEVEL, -35);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  // 3. Paved Road Network (offset Y >= 0.05 above terrain to eliminate Z-fighting)
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    roughness: 0.85,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const addRoadSegment = (x: number, z: number, w: number, len: number, rotY = 0) => {
    const tex = textures.asphalt.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, Math.max(1, Math.round(len / 14)));
    const mat = roadMat.clone();
    mat.map = tex;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rotY;
    road.position.set(x, 0.06, z);
    road.receiveShadow = true;
    scene.add(road);
  };

  // Kathmandu Central Ring & Arterials
  addRoadSegment(0, -64, 11, 138, Math.PI / 2); // North Blvd
  addRoadSegment(0, 64, 11, 138, Math.PI / 2); // South Blvd
  addRoadSegment(-64, 0, 11, 138, 0); // West Ring
  addRoadSegment(64, 0, 11, 138, 0); // East Ring
  addRoadSegment(0, 30, 9, 128, Math.PI / 2); // Midtown Cross
  addRoadSegment(-28, 0, 9, 128, 0); // Durbar West Ave
  addRoadSegment(28, 0, 9, 128, 0); // Durbar East Ave

  // Highway West to Pokhara Lakeside
  addRoadSegment(-112, -26, 10, 96, Math.PI / 2);
  // Highway East to Tribhuvan Skyport
  addRoadSegment(104, 10, 10, 82, Math.PI / 2);
  // Tribhuvan Skyport Runway Strip
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 92),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.rotation.z = Math.PI / 2;
  runway.position.set(150, 0.07, 10);
  runway.receiveShadow = true;
  scene.add(runway);

  // Highway South to Terai Ring Terminal
  addRoadSegment(0, 130, 12, 130, 0);
  addRoadSegment(0, 194, 12, 140, Math.PI / 2);

  // Climbing Switchback Himalayan Road Ribbon (z from -64 to -220)
  const roadStep = 8;
  for (let z = -68; z >= -220; z -= roadStep) {
    const zNext = z - roadStep;
    const x1 = z < -95 ? Math.sin((-z - 95) * 0.045) * 14 - 8 : -8;
    const x2 = zNext < -95 ? Math.sin((-zNext - 95) * 0.045) * 14 - 8 : -8;
    const y1 = groundHeightAt(x1, z) + 0.1;
    const y2 = groundHeightAt(x2, zNext) + 0.1;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = zNext - z;
    const segLen = Math.hypot(dx, dy, dz) + 0.8;
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.18, segLen),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 }),
    );
    seg.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z + zNext) * 0.5);
    seg.lookAt(x2, y2, zNext);
    seg.receiveShadow = true;
    scene.add(seg);
  }

  // Suspension Bridge across Himalayan Gorge (around z = -135)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(Math.sin((135 - 95) * 0.045) * 14 - 8, groundHeightAt(-8, -135) + 0.1, -135);
  const pylonMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45, metalness: 0.4 });
  for (const px of [-4.6, 4.6]) {
    for (const pz of [-6, 6]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.5, 0.45), pylonMat);
      pylon.position.set(px, 2.75, pz);
      pylon.castShadow = true;
      bridgeGroup.add(pylon);
    }
  }
  scene.add(bridgeGroup);

  // 4. Durbar Square Stone Plaza & Aarya Durbar Pagoda Temple
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({
      map: textures.plazaTile,
      roughness: 0.88,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.07, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);

  const temple = createPagodaTemple(textures.newariBrick);
  temple.position.set(0, 0, -4);
  scene.add(temple);
  colliders.push({ minX: -7, maxX: 7, minZ: -11, maxZ: 3, height: 15 });

  // 5. Kathmandu, Pokhara & Terai Buildings (grouped cleanly with colliders)
  const newariMat = new THREE.MeshStandardMaterial({ map: textures.newariBrick, roughness: 0.82 });
  const glassMat = new THREE.MeshStandardMaterial({ map: textures.modernGlass, roughness: 0.35, metalness: 0.45 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.78 });
  const roofTrimMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.3 });

  const addBuilding = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    style: 'newari' | 'modern' | 'police' | 'hospital' | 'garage' | 'rural',
  ) => {
    const baseY = groundHeightAt(x, z);
    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const wallMat =
      style === 'newari'
        ? newariMat
        : style === 'modern'
          ? glassMat
          : style === 'police'
            ? new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.55 })
            : style === 'hospital'
              ? new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.5 })
              : style === 'garage'
                ? new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.6 })
                : concreteMat;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (style === 'newari' || style === 'rural') {
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.75, 2.4, 4),
        new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.7 }),
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.y = h + 1.2;
      roof.castShadow = true;
      group.add(roof);
    } else {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), roofTrimMat);
      parapet.position.y = h + 0.25;
      group.add(parapet);
    }

    // Special landmark signage accents
    if (style === 'hospital') {
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 2.2, 0.2),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.5 }),
      );
      crossV.position.set(0, h * 0.65, d * 0.5 + 0.12);
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.6, 0.2),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.5 }),
      );
      crossH.position.set(0, h * 0.65, d * 0.5 + 0.12);
      group.add(crossV, crossH);
    } else if (style === 'police') {
      const sirenBand = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.6, 0.45, 0.2),
        new THREE.MeshStandardMaterial({ color: '#3b82f6', emissive: '#2563eb', emissiveIntensity: 0.9 }),
      );
      sirenBand.position.set(0, h + 0.5, d * 0.5 + 0.05);
      group.add(sirenBand);
    }

    scene.add(group);
    colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      height: h,
    });
  };

  // Kathmandu Districts
  addBuilding(-14, -44, 14, 12, 11, 'newari');
  addBuilding(14, -44, 14, 12, 12, 'newari');
  addBuilding(-46, -44, 14, 14, 22, 'modern');
  addBuilding(-46, -12, 13, 14, 16, 'newari');
  addBuilding(46, -14, 14, 16, 28, 'modern');
  addBuilding(46, 12, 12, 12, 19, 'modern');
  addBuilding(14, 46, 12, 12, 14, 'newari');
  addBuilding(-14, 46, 12, 12, 11, 'newari');

  // Key Interactive Facility Buildings (slightly offset from landmark interaction rings)
  addBuilding(56, -54, 16, 12, 10, 'police'); // Metro Police HQ
  addBuilding(-54, 54, 16, 12, 7.5, 'garage'); // Thamel Customs Garage
  addBuilding(68, 48, 16, 14, 12, 'hospital'); // Bir Valley Hospital
  addBuilding(140, -10, 22, 12, 9, 'modern'); // Skyport Terminal

  // Pokhara Lakeside Resorts
  addBuilding(-146, -52, 16, 12, 9, 'newari');
  addBuilding(-146, -12, 16, 12, 11, 'modern');
  addBuilding(-162, 14, 14, 10, 8, 'newari');

  // Terai Terminal & Warehouses
  addBuilding(-22, 180, 18, 12, 7, 'garage');
  addBuilding(26, 174, 20, 12, 8, 'modern');
  addBuilding(-28, 212, 16, 12, 6, 'rural');
  addBuilding(28, 212, 16, 12, 6, 'rural');

  // Himalayan Base Camp Lodge & Rural Farmhouses
  addBuilding(-26, -215, 11, 9, 5.5, 'rural');
  addBuilding(62, -125, 9, 8, 5, 'rural');
  addBuilding(-82, 85, 9, 8, 5, 'rural');

  // 6. Instanced Pine & Valley Trees (performance-friendly InstancedMesh with color & scale variation)
  const treeCount = 170;
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 2.4, 7);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.92 });
  const canopyGeo = new THREE.ConeGeometry(1.75, 4.8, 7);
  canopyGeo.translate(0, 4.3, 0);
  const canopyMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  trunkInst.castShadow = !isSoftwareGl;
  canopyInst.castShadow = !isSoftwareGl;

  const dummy = new THREE.Object3D();
  const leafColor = new THREE.Color();
  let placed = 0;
  let seed = 42;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  while (placed < treeCount) {
    const angle = nextRand() * Math.PI * 2;
    const rad = 52 + nextRand() * 215;
    const tx = Math.cos(angle) * rad;
    const tz = Math.sin(angle) * rad;
    const ty = groundHeightAt(tx, tz);

    // Avoid roads, lake, and central plaza
    if (ty < -0.2) continue;
    if (Math.abs(tx) < 72 && Math.abs(tz) < 72) continue;
    if (Math.abs(tx) < 16 && tz > 50 && tz < 210) continue;
    if (Math.abs(tz + 26) < 14 && tx < -50 && tx > -170) continue;
    if (Math.abs(tz - 10) < 24 && tx > 60 && tx < 200) continue;
    if (tz < -60 && Math.abs(tx + 8) < 28) continue;

    const sc = 0.85 + nextRand() * 0.35; // +-15% variation
    dummy.position.set(tx, ty, tz);
    dummy.rotation.y = nextRand() * Math.PI * 2;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(placed, dummy.matrix);
    canopyInst.setMatrixAt(placed, dummy.matrix);

    const shade = 0.72 + nextRand() * 0.28;
    leafColor.setRGB(0.14 * shade, 0.42 * shade, 0.18 * shade);
    canopyInst.setColorAt(placed, leafColor);
    placed++;
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  scene.add(trunkInst, canopyInst);

  // 7. Distant Himalayan Snow-Capped Mountain Peaks (Framing the North Horizon)
  const peakMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.75,
    metalness: 0.05,
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.45,
  });

  const peaks = [
    { x: -240, z: -330, r: 95, h: 135 },
    { x: -95, z: -355, r: 110, h: 168 },
    { x: 60, z: -345, r: 105, h: 152 },
    { x: 215, z: -325, r: 95, h: 128 },
    { x: -325, z: -180, r: 85, h: 95 },
    { x: 325, z: -160, r: 85, h: 92 },
  ];

  for (const p of peaks) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(p.r, p.h, 6), peakMat);
    mountain.position.set(p.x, p.h * 0.42, p.z);
    mountain.rotation.y = p.x * 0.02;
    scene.add(mountain);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(p.r * 0.48, p.h * 0.46, 6), snowCapMat);
    cap.position.set(p.x, p.h * 0.72, p.z);
    cap.rotation.y = p.x * 0.02;
    scene.add(cap);
  }

  // 8. Streetlights along Kathmandu Ring Road
  const streetLampBulbs = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#f59e0b',
    emissiveIntensity: 0.2,
    roughness: 0.3,
  });
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.4 });
  const lampPositions: Array<[number, number]> = [];
  for (let p = -56; p <= 56; p += 28) {
    lampPositions.push([p, -57], [p, 57], [-57, p], [57, p]);
  }
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 5.2, 6);
  poleGeo.translate(0, 2.6, 0);
  const bulbGeo = new THREE.BoxGeometry(0.42, 0.16, 0.42);
  bulbGeo.translate(0, 5.25, 0);

  const polesInst = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
  const bulbsInst = new THREE.InstancedMesh(bulbGeo, streetLampBulbs, lampPositions.length);
  lampPositions.forEach(([lx, lz], idx) => {
    dummy.position.set(lx, groundHeightAt(lx, lz), lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    polesInst.setMatrixAt(idx, dummy.matrix);
    bulbsInst.setMatrixAt(idx, dummy.matrix);
  });
  polesInst.instanceMatrix.needsUpdate = true;
  bulbsInst.instanceMatrix.needsUpdate = true;
  polesInst.computeBoundingSphere();
  bulbsInst.computeBoundingSphere();
  scene.add(polesInst, bulbsInst);

  // 9. Working Traffic Signals at Kathmandu Intersections
  const intersections: Array<{ x: number; z: number; axis: 'x' | 'z' }> = [
    { x: -64, z: -64, axis: 'x' },
    { x: 64, z: -64, axis: 'z' },
    { x: -64, z: 64, axis: 'z' },
    { x: 64, z: 64, axis: 'x' },
  ];
  for (const node of intersections) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.6, 8), poleMat);
    post.position.set(node.x + 6.5, 2.3, node.z + 6.5);
    scene.add(post);

    const redBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1 }),
    );
    redBulb.position.set(node.x + 6.5, 4.3, node.z + 6.5);

    const greenBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.2 }),
    );
    greenBulb.position.set(node.x + 6.5, 3.8, node.z + 6.5);

    scene.add(redBulb, greenBulb);
    trafficLights.push({ ...node, redBulb, greenBulb });
  }

  // 10. Discoverable Landmark Hologram Beacons
  for (const lm of LANDMARKS) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.14, 10, 28),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#f59e0b',
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(lm.x, groundHeightAt(lm.x, lm.z) + 0.35, lm.z);
    scene.add(ring);
    landmarkBeacons.push({ id: lm.id, x: lm.x, z: lm.z, ring });
  }

  // Road loop waypoints for AI traffic
  const roadNodes = [
    { x: -64, z: -64 },
    { x: 64, z: -64 },
    { x: 64, z: 64 },
    { x: -64, z: 64 },
  ];

  const updateEnvironment = (timeOfDay: number, dt: number) => {
    const isNight = timeOfDay < 6.2 || timeOfDay > 18.4;
    streetLampBulbs.emissiveIntensity = THREE.MathUtils.lerp(
      streetLampBulbs.emissiveIntensity,
      isNight ? 2.4 : 0.15,
      Math.min(1, dt * 3),
    );
  };

  return {
    colliders,
    trafficLights,
    streetLampBulbs,
    waterMesh,
    landmarkBeacons,
    roadNodes,
    updateEnvironment,
  };
}
