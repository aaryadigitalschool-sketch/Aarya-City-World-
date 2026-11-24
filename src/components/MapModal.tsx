import React from 'react';
import { Compass, Navigation, X } from 'lucide-react';
import { LANDMARKS, REGION_LABELS } from '../game/types';

interface MapModalProps {
  playerX: number;
  playerZ: number;
  discoveredLandmarks: string[];
  onSetWaypoint: (x: number, z: number, label: string) => void;
  onFastTravel: (x: number, z: number, label: string) => void;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  playerX,
  playerZ,
  discoveredLandmarks,
  onSetWaypoint,
  onFastTravel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-4xl bg-[#0e1420] border border-white/15 rounded-lg overflow-hidden flex flex-col md:flex-row">
        {/* Interactive SVG Vector Map */}
        <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">
                AARYA CITY — Nepal Region Atlas
              </h2>
              <p className="text-xs text-slate-400">
                Click any landmark to set a GPS waypoint or fast-travel
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#090d16] border border-white/10 rounded-md p-2">
            <svg viewBox="-280 -280 560 560" className="w-full h-[340px] md:h-[400px]">
              {/* Regions */}
              <rect x="-280" y="-280" width="560" height="560" fill="#0b111d" />
              <rect x="-270" y="-270" width="540" height="165" fill="#172536" opacity="0.65" />
              <text x="-255" y="-245" fill="#93c5fd" fontSize="14" fontFamily="Oxanium">
                HIMALAYAN RIDGE
              </text>
              <rect x="-270" y="-100" width="160" height="200" fill="#0e2938" opacity="0.6" />
              <text x="-255" y="-78" fill="#67e8f9" fontSize="13" fontFamily="Oxanium">
                POKHARA
              </text>
              <circle cx="-195" cy="-35" r="44" fill="#0891b2" opacity="0.55" />
              <rect x="-270" y="110" width="540" height="160" fill="#1e2a17" opacity="0.65" />
              <text x="-255" y="255" fill="#bef264" fontSize="14" fontFamily="Oxanium">
                TERAI HIGHWAY
              </text>

              {/* Roads */}
              <rect x="-66" y="-66" width="132" height="132" fill="none" stroke="#475569" strokeWidth="6" />
              <line x1="0" y1="64" x2="0" y2="195" stroke="#475569" strokeWidth="7" />
              <line x1="-64" y1="-26" x2="-165" y2="-26" stroke="#475569" strokeWidth="6" />
              <line x1="64" y1="10" x2="175" y2="10" stroke="#475569" strokeWidth="6" />
              <line x1="-8" y1="-64" x2="-10" y2="-215" stroke="#64748b" strokeWidth="5" strokeDasharray="6 4" />

              {/* Landmarks */}
              {LANDMARKS.map((lm) => {
                const found = discoveredLandmarks.includes(lm.id);
                return (
                  <g
                    key={lm.id}
                    className="cursor-pointer"
                    onClick={() => onSetWaypoint(lm.x, lm.z, lm.name)}
                  >
                    <circle
                      cx={lm.x}
                      cy={lm.z}
                      r="8"
                      fill={found ? '#f59e0b' : '#334155'}
                      stroke="#fde68a"
                      strokeWidth="2"
                    />
                    <text
                      x={lm.x}
                      y={lm.z - 12}
                      textAnchor="middle"
                      fill="#f1f5f9"
                      fontSize="10"
                    >
                      {lm.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Player Marker */}
              <circle cx={playerX} cy={playerZ} r="7" fill="#22d3ee" stroke="#ffffff" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        {/* Landmarks List */}
        <div className="w-full md:w-80 p-5 flex flex-col max-h-[480px] overflow-y-auto">
          <h3 className="font-display font-semibold text-sm text-amber-400 mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>Landmarks ({discoveredLandmarks.length}/{LANDMARKS.length})</span>
          </h3>
          <div className="flex flex-col gap-2">
            {LANDMARKS.map((lm) => {
              const found = discoveredLandmarks.includes(lm.id);
              return (
                <div
                  key={lm.id}
                  className="p-2.5 rounded bg-[#141c2c] border border-white/10 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">{lm.name}</span>
                    <span className="text-[11px] text-slate-400">{REGION_LABELS[lm.region]}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{lm.description}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        onSetWaypoint(lm.x, lm.z, lm.name);
                        onClose();
                      }}
                      className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      GPS
                    </button>
                    <button
                      onClick={() => {
                        onFastTravel(lm.x, lm.z, lm.name);
                        onClose();
                      }}
                      className="flex-1 py-1 px-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px]"
                    >
                      {found ? 'Fast Travel' : 'Travel'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
