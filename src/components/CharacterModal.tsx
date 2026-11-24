import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCw, User, X } from 'lucide-react';
import { createCharacterRig, type CharacterRig } from '../game/models';
import { createProceduralTextures } from '../game/textures';
import type {
  AccessoryType,
  CharacterAnimState,
  ClothingStyle,
  FaceStyle,
  HairStyle,
  PlayerCustomization,
  PlayerProgress,
  ShoeStyle,
} from '../game/types';

interface CharacterModalProps {
  customization: PlayerCustomization;
  progress: PlayerProgress;
  onUpdate: (next: PlayerCustomization) => void;
  onClose: () => void;
}

const OUTFITS = ['#d97706', '#0284c7', '#be123c', '#15803d', '#4338ca', '#1e293b'];
const HAIRS = ['#1e1b18', '#451a03', '#78350f', '#cbd5e1'];
const SKINS = ['#d49a73', '#b87a52', '#f1c29b', '#8d5534'];

const FACES: Array<{ id: FaceStyle; label: string }> = [
  { id: 'oval', label: 'Oval' },
  { id: 'angular', label: 'Angular' },
  { id: 'broad', label: 'Broad' },
];

const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: 'short_taper', label: 'Short Taper' },
  { id: 'layered_long', label: 'Layered Long' },
  { id: 'top_knot', label: 'Top Knot' },
  { id: 'slick_back', label: 'Slick Back' },
  { id: 'braid', label: 'Braid' },
];

const CLOTHING_STYLES: Array<{ id: ClothingStyle; label: string }> = [
  { id: 'urban_parka', label: 'Urban Parka' },
  { id: 'nepali_daura', label: 'Nepali Daura' },
  { id: 'kathmandu_street', label: 'Kathmandu Street' },
  { id: 'trekking_vest', label: 'Trekking Vest' },
  { id: 'formal_blazer', label: 'Formal Blazer' },
];

const SHOE_STYLES: Array<{ id: ShoeStyle; label: string }> = [
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'hiking_boots', label: 'Hiking Boots' },
  { id: 'dress_shoes', label: 'Dress Shoes' },
];

const ACCESSORIES: Array<{ id: AccessoryType; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'dhaka_topi', label: 'Dhaka Topi' },
  { id: 'sunglasses', label: 'Sunglasses' },
  { id: 'scarf', label: 'Himalayan Scarf' },
  { id: 'backpack', label: 'Trail Pack' },
];

const PREVIEW_POSES: Array<{ id: CharacterAnimState; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'talk', label: 'Talk' },
  { id: 'combat', label: 'Combat' },
];

export const CharacterModal: React.FC<CharacterModalProps> = ({
  customization,
  progress,
  onUpdate,
  onClose,
}) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const yawRef = useRef(0.35);
  const autoSpinRef = useRef(true);
  const poseRef = useRef<CharacterAnimState>('idle');
  const [previewPose, setPreviewPose] = useState<CharacterAnimState>('idle');

  useEffect(() => {
    poseRef.current = previewPose;
  }, [previewPose]);

  useEffect(() => {
    rigRef.current?.updateAppearance(customization, 'player');
  }, [customization]);

  useEffect(() => {
    const mount = previewRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const w = mount.clientWidth || 260;
    const h = mount.clientHeight || 340;
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 40);
    camera.position.set(0, 1.28, 3.05);
    camera.lookAt(0, 1.0, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight('#bae6fd', '#334155', 0.65);
    const keyLight = new THREE.DirectionalLight('#fff4d6', 1.6);
    keyLight.position.set(2.5, 4.0, 3.2);
    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.85);
    rimLight.position.set(-2.5, 2.8, -2.5);
    scene.add(hemi, keyLight, rimLight);

    // Sculpted Studio Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.08, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.55 }),
    );
    pedestal.position.y = -0.08;
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.02, 8, 48),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#d97706',
        emissiveIntensity: 0.9,
      }),
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.01;
    scene.add(pedestal, rimRing);

    const tex = createProceduralTextures(1);
    const rig = createCharacterRig(customization, tex.contactShadow, 'player');
    rig.setLodLevel(0);
    rig.group.rotation.y = yawRef.current;
    scene.add(rig.group);
    rigRef.current = rig;

    let dragging = false;
    let lastX = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      autoSpinRef.current = false;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yawRef.current += (e.clientX - lastX) * 0.014;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let disposed = false;
    let frameId = 0;
    let prev = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      if (autoSpinRef.current) yawRef.current += dt * 0.45;
      rig.group.rotation.y = yawRef.current;

      const pose = poseRef.current;
      const simSpeed = pose === 'walk' ? 2.4 : 0;
      const atk = pose === 'combat' ? ((now * 0.004) % 0.6) + 0.05 : 0;
      rig.animate(dt, simSpeed, true, false, false, atk, pose);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      rigRef.current = null;
      tex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0e1420] border border-white/15 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg text-slate-100">
              3D Character Studio & Career Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Live 3D Character Turntable */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="relative h-80 sm:h-96 rounded-md overflow-hidden border border-white/15 bg-[#090d16]">
              <div ref={previewRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              <button
                type="button"
                onClick={() => {
                  autoSpinRef.current = !autoSpinRef.current;
                }}
                title="Toggle turntable spin"
                className="absolute top-2.5 right-2.5 p-2 rounded bg-[#0e1420] border border-white/15 text-slate-200 hover:bg-slate-800"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                {PREVIEW_POSES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreviewPose(p.id)}
                    className={`flex-1 py-1.5 rounded text-[11px] font-semibold border ${
                      previewPose === p.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#0e1420] text-slate-300 border-white/15 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Career Statistics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-[#141c2c] border border-white/10">
                <div className="text-slate-400">Level / XP</div>
                <div className="font-mono-tabular font-bold text-amber-400 mt-0.5">
                  L{progress.level} ({progress.xp})
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#141c2c] border border-white/10">
                <div className="text-slate-400">Missions</div>
                <div className="font-mono-tabular font-bold text-slate-100 mt-0.5">
                  {progress.stats.missionsCleared}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#141c2c] border border-white/10">
                <div className="text-slate-400">Driven</div>
                <div className="font-mono-tabular font-bold text-slate-100 mt-0.5">
                  {progress.stats.distanceDrivenKm.toFixed(1)} km
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#141c2c] border border-white/10">
                <div className="text-slate-400">Max Wanted</div>
                <div className="font-mono-tabular font-bold text-red-400 mt-0.5">
                  {progress.stats.maxWantedSurvived} ★
                </div>
              </div>
            </div>
          </div>

          {/* Rig & Appearance Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Character Name</label>
                <input
                  type="text"
                  maxLength={20}
                  value={customization.name}
                  onChange={(e) => onUpdate({ ...customization, name: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#090d16] border border-white/15 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Humanoid Base</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => onUpdate({ ...customization, gender: g })}
                      className={`py-2 rounded text-xs font-semibold capitalize border ${
                        customization.gender === g
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-[#090d16] text-slate-300 border-white/15 hover:bg-slate-800'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Facial Structure</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FACES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdate({ ...customization, faceStyle: f.id })}
                      className={`py-1.5 rounded text-xs font-semibold border ${
                        customization.faceStyle === f.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-[#090d16] text-slate-300 border-white/15 hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Footwear</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {SHOE_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onUpdate({ ...customization, shoeStyle: s.id })}
                      className={`py-1.5 rounded text-xs font-semibold border ${
                        customization.shoeStyle === s.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-[#090d16] text-slate-300 border-white/15 hover:bg-slate-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Hairstyle</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onUpdate({ ...customization, hairStyle: h.id })}
                    className={`py-1.5 px-2 rounded text-xs font-semibold border ${
                      customization.hairStyle === h.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#090d16] text-slate-300 border-white/15 hover:bg-slate-800'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Clothing & Cultural Attire</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {CLOTHING_STYLES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onUpdate({ ...customization, clothingStyle: c.id })}
                    className={`py-1.5 px-2 rounded text-xs font-semibold border ${
                      customization.clothingStyle === c.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#090d16] text-slate-300 border-white/15 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Accessories</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {ACCESSORIES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onUpdate({ ...customization, accessory: a.id })}
                    className={`py-1.5 px-2 rounded text-xs font-semibold border ${
                      customization.accessory === a.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#090d16] text-slate-300 border-white/15 hover:bg-slate-800'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Garment Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {OUTFITS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => onUpdate({ ...customization, outfitColor: hex })}
                      style={{ backgroundColor: hex }}
                      className={`w-6 h-6 rounded-sm border ${
                        customization.outfitColor === hex ? 'border-white scale-110' : 'border-white/25'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Hair Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {HAIRS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => onUpdate({ ...customization, hairColor: hex })}
                      style={{ backgroundColor: hex }}
                      className={`w-6 h-6 rounded-sm border ${
                        customization.hairColor === hex ? 'border-white scale-110' : 'border-white/25'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Skin Material</label>
                <div className="flex flex-wrap gap-1.5">
                  {SKINS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => onUpdate({ ...customization, skinTone: hex })}
                      style={{ backgroundColor: hex }}
                      className={`w-6 h-6 rounded-sm border ${
                        customization.skinTone === hex ? 'border-white scale-110' : 'border-white/25'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Rig Body Proportions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/10">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Height Proportion</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(customization.heightScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.94}
                  max={1.08}
                  step={0.01}
                  value={customization.heightScale}
                  onChange={(e) =>
                    onUpdate({ ...customization, heightScale: Number(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Shoulder & Build</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(customization.buildScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.9}
                  max={1.12}
                  step={0.01}
                  value={customization.buildScale}
                  onChange={(e) =>
                    onUpdate({ ...customization, buildScale: Number(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
