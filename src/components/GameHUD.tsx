import React, { useRef, useState } from 'react';
import {
  Car,
  Crosshair,
  Map as MapIcon,
  Pause,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { WEAPON_CATALOG, type HudSnapshot, type WeaponId } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  touchControls: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onOpenPause: () => void;
  onOpenMap: () => void;
  onOpenMissions: () => void;
  onOpenGarage: () => void;
  onSelectWeapon: (w: WeaponId) => void;
  onVirtualInput: (mx: number, my: number, sprint: boolean, brake: boolean) => void;
  onTriggerAction: (action: 'jump' | 'enter' | 'attack' | 'interact' | 'horn') => void;
}

function formatClock(hourFloat: number): string {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  touchControls,
  muted,
  onToggleMute,
  onOpenPause,
  onOpenMap,
  onOpenMissions,
  onOpenGarage,
  onSelectWeapon,
  onVirtualInput,
  onTriggerAction,
}) => {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const sprintRef = useRef(false);
  const brakeRef = useRef(false);

  const handleJoystickMove = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > maxR) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    onVirtualInput(dx / maxR, dy / maxR, sprintRef.current, brakeRef.current);
  };

  const resetJoystick = () => {
    setJoyKnob({ x: 0, y: 0 });
    onVirtualInput(0, 0, sprintRef.current, brakeRef.current);
  };

  const mapScale = 0.42; // 110px radius covers ~260m

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-5">
      {/* Top Perimeter Strip */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Interactive Minimap + Region */}
        <div className="flex items-start gap-3 pointer-events-auto">
          <button
            onClick={onOpenMap}
            title="Open Region Map (M)"
            className="relative w-28 h-28 md:w-32 md:h-32 rounded-lg bg-[#090d16]/90 border border-white/15 overflow-hidden shrink-0 hover:border-amber-400/60 transition-colors"
          >
            <svg viewBox="-64 -64 128 128" className="w-full h-full">
              <rect x="-64" y="-64" width="128" height="128" fill="#0c121e" />
              {/* Grid lines */}
              <line x1="-64" y1="0" x2="64" y2="0" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="-64" x2="0" y2="64" stroke="#1e293b" strokeWidth="1" />

              {hud.blips.map((b, i) => {
                const bx = (b.x - hud.playerX) * mapScale;
                const bz = (b.z - hud.playerZ) * mapScale;
                if (Math.abs(bx) > 60 || Math.abs(bz) > 60) return null;
                const fill =
                  b.type === 'objective'
                    ? '#22d3ee'
                    : b.type === 'police'
                      ? '#ef4444'
                      : b.type === 'landmark'
                        ? '#f59e0b'
                        : b.type === 'remote'
                          ? '#34d399'
                          : '#94a3b8';
                const r = b.type === 'objective' ? 3.5 : b.type === 'landmark' ? 2.6 : 2;
                return <circle key={i} cx={bx} cy={bz} r={r} fill={fill} />;
              })}

              {/* Player Heading Arrow */}
              <g transform={`rotate(${(-hud.playerRotY * 180) / Math.PI + 180})`}>
                <polygon points="0,-5 3.6,4 0,2 -3.6,4" fill="#ffffff" />
              </g>
            </svg>
            <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-slate-300 font-mono-tabular">
              <span className="truncate">{hud.regionLabel}</span>
              <MapIcon className="w-3 h-3 text-amber-400 shrink-0" />
            </div>
          </button>

          {/* Active Mission Objective */}
          {hud.activeMission ? (
            <div className="bg-[#090d16]/90 border border-cyan-500/35 rounded-md px-3 py-2 max-w-[240px] md:max-w-xs">
              <div className="flex items-center justify-between gap-2 text-[11px] text-cyan-300 font-semibold">
                <span className="truncate">{hud.activeMission.title}</span>
                <span className="font-mono-tabular shrink-0">
                  {hud.activeMission.stepIndex}/{hud.activeMission.totalSteps}
                </span>
              </div>
              <p className="text-xs text-slate-100 mt-0.5 leading-snug">
                {hud.activeMission.objective}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono-tabular">
                <span>{hud.activeMission.distanceM} m</span>
                {hud.activeMission.timeLeftSec !== null ? (
                  <span className="text-amber-400 font-semibold">
                    {hud.activeMission.timeLeftSec}s left
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenMissions}
              className="bg-[#090d16]/85 hover:bg-[#131b2c] border border-white/15 rounded-md px-3 py-1.5 text-xs text-slate-200 transition-colors"
            >
              Missions (J)
            </button>
          )}
        </div>

        {/* Top-Right: Money, Wanted Stars, Weather, Quick Buttons */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#090d16]/90 border border-white/15 rounded-md px-3 py-1.5">
            <span className="font-display font-bold text-amber-400 text-sm md:text-base tabular-nums">
              NPR {hud.money.toLocaleString()}
            </span>
            <span className="text-slate-600" aria-hidden="true">|</span>
            <span className="text-xs text-slate-300 font-mono-tabular">
              LVL {hud.level}
            </span>
            <span className="text-slate-600" aria-hidden="true">|</span>
            <span className="text-xs text-slate-400 font-mono-tabular">
              {formatClock(hud.timeOfDay)} · {hud.weather.replace('_', ' ')}
            </span>
            <span className="hidden sm:inline text-slate-600" aria-hidden="true">|</span>
            <span className="hidden sm:inline text-xs text-slate-400 font-mono-tabular">
              {hud.fps} FPS
            </span>
          </div>

          {/* Wanted Level Indicator */}
          {hud.wantedLevel > 0 ? (
            <div className="flex items-center gap-1.5 bg-[#1b0c0c]/95 border border-red-500/50 rounded-md px-3 py-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-sm leading-none ${
                      star <= hud.wantedLevel ? 'text-red-400' : 'text-slate-700'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-red-200 font-mono-tabular ml-1">
                WANTED
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenGarage}
              title="Garage (G)"
              className="p-2 rounded bg-[#090d16]/90 hover:bg-[#162033] border border-white/15 text-slate-200 transition-colors"
            >
              <Car className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMute}
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2 rounded bg-[#090d16]/90 hover:bg-[#162033] border border-white/15 text-slate-200 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenPause}
              title="Pause Menu (Esc)"
              className="p-2 rounded bg-[#090d16]/90 hover:bg-[#162033] border border-white/15 text-slate-200 transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Banners, Dialogue & Interaction Prompt */}
      <div className="flex flex-col items-center justify-center gap-3 my-auto">
        {hud.bannerMessage ? (
          <div className="bg-[#090d16]/95 border border-amber-400/50 rounded-md px-5 py-2 text-sm font-display font-semibold text-amber-300 tracking-wide">
            {hud.bannerMessage}
          </div>
        ) : null}

        {hud.dialogue ? (
          <div className="bg-[#090d16]/95 border border-white/15 rounded-md px-5 py-3 max-w-lg text-center">
            <div className="text-xs font-display font-bold text-amber-400 mb-0.5">
              {hud.dialogue.speaker}
            </div>
            <p className="text-sm text-slate-100 leading-snug">{hud.dialogue.line}</p>
          </div>
        ) : null}

        {hud.interactionPrompt ? (
          <button
            onClick={() =>
              onTriggerAction(hud.interactionPrompt?.includes('enter') ? 'enter' : 'interact')
            }
            className="pointer-events-auto bg-[#090d16]/95 border border-cyan-400/60 rounded-md px-4 py-1.5 text-xs font-medium text-cyan-200"
          >
            {hud.interactionPrompt}
          </button>
        ) : null}
      </div>

      {/* Bottom Perimeter Strip + Optional Mobile Touch Controls */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Health, Stamina, or Touch Joystick */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {touchControls ? (
            <div
              ref={joyRef}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handleJoystickMove(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (e.buttons > 0) handleJoystickMove(e.clientX, e.clientY);
              }}
              onPointerUp={resetJoystick}
              onPointerCancel={resetJoystick}
              className="relative w-28 h-28 rounded-full bg-[#090d16]/75 border border-white/25 touch-none flex items-center justify-center mb-1"
            >
              <div
                style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
                className="w-11 h-11 rounded-full bg-amber-400/80 border border-white/40 pointer-events-none"
              />
            </div>
          ) : null}

          <div className="bg-[#090d16]/90 border border-white/15 rounded-md p-2.5 w-52">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span>Health</span>
              <span className="font-mono-tabular">{hud.health}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-sm overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span>Stamina</span>
              <span className="font-mono-tabular">{hud.stamina}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${(hud.stamina / hud.maxStamina) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom-Right: Weapon Selector OR Vehicle Telemetry + Touch Actions */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {touchControls ? (
            <div className="grid grid-cols-3 gap-1.5 mb-1">
              <button
                onPointerDown={() => {
                  sprintRef.current = true;
                  onVirtualInput(0, 0, true, brakeRef.current);
                }}
                onPointerUp={() => {
                  sprintRef.current = false;
                  onVirtualInput(0, 0, false, brakeRef.current);
                }}
                className="w-12 h-12 rounded bg-[#0f172a]/90 border border-white/20 text-[11px] font-semibold text-slate-100"
              >
                Sprint
              </button>
              <button
                onClick={() => onTriggerAction('jump')}
                className="w-12 h-12 rounded bg-[#0f172a]/90 border border-white/20 text-[11px] font-semibold text-slate-100"
              >
                Jump
              </button>
              <button
                onClick={() => onTriggerAction('attack')}
                className="w-12 h-12 rounded bg-amber-500/90 border border-amber-300 text-[11px] font-bold text-slate-950"
              >
                Action
              </button>
              <button
                onClick={() => onTriggerAction('enter')}
                className="w-12 h-12 rounded bg-cyan-600/90 border border-cyan-300 text-[11px] font-semibold text-white"
              >
                {hud.inVehicle ? 'Exit' : 'Enter'}
              </button>
              <button
                onPointerDown={() => {
                  brakeRef.current = true;
                  onVirtualInput(0, 0, sprintRef.current, true);
                }}
                onPointerUp={() => {
                  brakeRef.current = false;
                  onVirtualInput(0, 0, sprintRef.current, false);
                }}
                className="w-12 h-12 rounded bg-[#0f172a]/90 border border-white/20 text-[11px] font-semibold text-slate-100"
              >
                Brake
              </button>
              <button
                onClick={() => onTriggerAction('interact')}
                className="w-12 h-12 rounded bg-[#0f172a]/90 border border-white/20 text-[11px] font-semibold text-slate-100"
              >
                Use
              </button>
            </div>
          ) : null}

          {hud.inVehicle ? (
            <div className="bg-[#090d16]/90 border border-white/15 rounded-md px-4 py-2.5 min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-medium text-slate-200">{hud.vehicleName}</span>
                <span className="font-mono-tabular">F Exit · H Horn</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-display font-bold text-3xl text-amber-400 tabular-nums">
                    {hud.speedKmh}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">km/h</span>
                </div>
                <div className="text-right text-xs font-mono-tabular text-slate-300">
                  <div>Fuel {hud.fuel}%</div>
                  <div>Hull {hud.vehicleHealth}%</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#090d16]/90 border border-white/15 rounded-md px-3 py-2 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1">
                {(['fists', 'khukuri', 'pistol', 'carbine'] as WeaponId[]).map((wId, idx) => (
                  <button
                    key={wId}
                    onClick={() => onSelectWeapon(wId)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      hud.weapon === wId
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}. {WEAPON_CATALOG[wId].name.split(' ')[0]}
                  </button>
                ))}
              </div>
              {hud.maxAmmo > 0 ? (
                <span className="text-xs font-mono-tabular text-slate-200 ml-1">
                  {hud.ammo}/{hud.maxAmmo}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
