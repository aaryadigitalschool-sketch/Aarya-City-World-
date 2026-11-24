import React from 'react';
import { Car, Check, Palette, X } from 'lucide-react';
import { VEHICLE_CATALOG, type PlayerProgress, type VehicleSpec } from '../game/types';

interface GarageModalProps {
  progress: PlayerProgress;
  onBuyVehicle: (spec: VehicleSpec) => void;
  onSpawnVehicle: (specId: string, colorHex: string) => void;
  onChangeColor: (specId: string, colorHex: string) => void;
  onClose: () => void;
}

const PAINT_SWATCHES = [
  '#e11d48',
  '#f59e0b',
  '#0284c7',
  '#15803d',
  '#7c3aed',
  '#1e293b',
  '#f8fafc',
];

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  onBuyVehicle,
  onSpawnVehicle,
  onChangeColor,
  onClose,
}) => {
  const driveable = VEHICLE_CATALOG.filter((v) => v.category !== 'police');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#0e1420] border border-white/15 rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">
              Thamel Customs & Vehicle Garage
            </h2>
            <p className="text-xs text-slate-400">
              Balance: <span className="text-amber-400 font-semibold tabular-nums">NPR {progress.money.toLocaleString()}</span> · Owned: {progress.ownedVehicles.length}/{driveable.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {driveable.map((v) => {
            const owned = progress.ownedVehicles.includes(v.id);
            const activeColor = progress.vehicleColors[v.id] || v.defaultColor;
            const canAfford = progress.money >= v.price;

            return (
              <div
                key={v.id}
                className="p-4 rounded-md bg-[#141c2c] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-display font-bold text-slate-100 flex items-center gap-2">
                      <Car className="w-4 h-4 text-amber-400" />
                      <span>{v.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">
                      {v.category} · Top {Math.round(v.maxSpeed * 3.6)} km/h · Grip {Math.round(v.grip * 100)}%
                    </div>
                  </div>
                  {owned ? (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Owned
                    </span>
                  ) : (
                    <span className="text-xs font-mono-tabular font-semibold text-amber-400">
                      NPR {v.price.toLocaleString()}
                    </span>
                  )}
                </div>

                {owned ? (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-slate-400 mr-1" />
                      {PAINT_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => onChangeColor(v.id, hex)}
                          style={{ backgroundColor: hex }}
                          aria-label={`Paint ${hex}`}
                          className={`w-5 h-5 rounded-sm border ${
                            activeColor === hex ? 'border-white scale-110' : 'border-white/25'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        onSpawnVehicle(v.id, activeColor);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap"
                    >
                      Deliver Ride
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onBuyVehicle(v)}
                    disabled={!canAfford}
                    className={`w-full py-1.5 px-3 rounded text-xs font-semibold transition-colors ${
                      canAfford
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? `Purchase for NPR ${v.price.toLocaleString()}` : 'Insufficient NPR'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
