import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphalt: THREE.CanvasTexture;
  newariBrick: THREE.CanvasTexture;
  modernGlass: THREE.CanvasTexture;
  plazaTile: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  terrainGrass: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Asphalt with dashed centerline & subtle aggregate
  const aspCanvas = document.createElement('canvas');
  aspCanvas.width = 256;
  aspCanvas.height = 256;
  const actx = aspCanvas.getContext('2d')!;
  actx.fillStyle = '#252932';
  actx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const shade = 30 + (i % 24);
    actx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 8})`;
    actx.fillRect(x, y, 2, 2);
  }
  actx.fillStyle = '#cbd5e1';
  actx.fillRect(4, 0, 5, 256);
  actx.fillRect(247, 0, 5, 256);
  actx.fillStyle = '#f59e0b';
  actx.fillRect(125, 16, 6, 86);
  actx.fillRect(125, 144, 6, 86);
  const asphalt = configureTexture(aspCanvas, maxAnisotropy, 1, 1);

  // 2. Newari Terracotta Brick + Timber Beam Trim
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 256;
  brickCanvas.height = 256;
  const bctx = brickCanvas.getContext('2d')!;
  bctx.fillStyle = '#8b3a2b';
  bctx.fillRect(0, 0, 256, 256);
  const rows = 16;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 16;
    for (let c = -1; c < 9; c++) {
      const x = c * 32 + offset;
      const y = r * rowH;
      const tone = ((r * 7 + c * 13) % 18) - 9;
      bctx.fillStyle = `rgb(${148 + tone}, ${64 + tone}, ${45 + tone})`;
      bctx.fillRect(x + 1, y + 1, 30, rowH - 2);
    }
  }
  // Carved dark timber lintels
  bctx.fillStyle = '#3b2314';
  bctx.fillRect(0, 52, 256, 10);
  bctx.fillRect(0, 176, 256, 10);
  // Traditional windows
  for (let wx of [34, 110, 186]) {
    bctx.fillStyle = '#29170d';
    bctx.fillRect(wx, 76, 36, 48);
    bctx.fillStyle = '#fbbf24';
    bctx.globalAlpha = 0.25;
    bctx.fillRect(wx + 5, 81, 26, 38);
    bctx.globalAlpha = 1;
  }
  const newariBrick = configureTexture(brickCanvas, maxAnisotropy, 2, 2);

  // 3. Modern Glass & Concrete Tower Facade
  const glassCanvas = document.createElement('canvas');
  glassCanvas.width = 256;
  glassCanvas.height = 256;
  const gctx = glassCanvas.getContext('2d')!;
  gctx.fillStyle = '#1e293b';
  gctx.fillRect(0, 0, 256, 256);
  for (let y = 8; y < 256; y += 32) {
    gctx.fillStyle = '#334155';
    gctx.fillRect(0, y - 4, 256, 6);
    for (let x = 8; x < 256; x += 32) {
      const lit = (x * 11 + y * 17) % 5 === 0;
      gctx.fillStyle = lit ? '#7dd3fc' : '#0f172a';
      gctx.fillRect(x, y + 4, 22, 20);
      if (lit) {
        gctx.fillStyle = 'rgba(255,255,255,0.28)';
        gctx.fillRect(x + 2, y + 6, 8, 16);
      }
    }
  }
  const modernGlass = configureTexture(glassCanvas, maxAnisotropy, 2, 3);

  // 4. Durbar Stone Plaza Tile
  const plazaCanvas = document.createElement('canvas');
  plazaCanvas.width = 256;
  plazaCanvas.height = 256;
  const pctx = plazaCanvas.getContext('2d')!;
  pctx.fillStyle = '#78716c';
  pctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const v = 112 + ((x * 5 + y * 9) % 24);
      pctx.fillStyle = `rgb(${v + 8}, ${v}, ${v - 8})`;
      pctx.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  const plazaTile = configureTexture(plazaCanvas, maxAnisotropy, 8, 8);

  // 5. Soft Radial Contact Shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const sctx = shCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const contactShadow = configureTexture(shCanvas, 1, 1, 1, true);
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  // 6. Valley Grass & Soil Variation
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const grctx = grassCanvas.getContext('2d')!;
  grctx.fillStyle = '#3f6234';
  grctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 59) % 256;
    const y = (i * 97) % 256;
    const g = 82 + (i % 34);
    grctx.fillStyle = `rgb(${Math.floor(g * 0.62)}, ${g}, ${Math.floor(g * 0.48)})`;
    grctx.fillRect(x, y, 3, 3);
  }
  const terrainGrass = configureTexture(grassCanvas, maxAnisotropy, 28, 28);

  return {
    asphalt,
    newariBrick,
    modernGlass,
    plazaTile,
    contactShadow,
    terrainGrass,
    dispose: () => {
      asphalt.dispose();
      newariBrick.dispose();
      modernGlass.dispose();
      plazaTile.dispose();
      contactShadow.dispose();
      terrainGrass.dispose();
    },
  };
}
