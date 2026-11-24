import React from 'react';
import { CheckCircle2, Flag, X } from 'lucide-react';
import { STORY_MISSIONS } from '../game/missions';
import { REGION_LABELS, type MissionDef, type PlayerProgress } from '../game/types';

interface MissionsModalProps {
  progress: PlayerProgress;
  activeMissionId: string | null;
  onStartMission: (missionId: string) => void;
  onAbortMission: () => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  progress,
  activeMissionId,
  onStartMission,
  onAbortMission,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-3xl max-h-[86vh] bg-[#0e1420] border border-white/15 rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">
              AARYA CITY — Story Campaign & Side Gigs
            </h2>
            <p className="text-xs text-slate-400">
              Cleared {progress.completedMissions.length}/{STORY_MISSIONS.length} contracts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-3">
          {STORY_MISSIONS.map((m: MissionDef) => {
            const cleared = progress.completedMissions.includes(m.id);
            const isActive = activeMissionId === m.id;
            return (
              <div
                key={m.id}
                className="p-4 rounded-md bg-[#141c2c] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="text-amber-400 font-semibold">
                      {m.chapter > 0 ? `Story Ch. ${m.chapter}` : 'Side Gig'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{REGION_LABELS[m.region]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      NPR {m.rewardMoney.toLocaleString()} / {m.rewardXp} XP
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{m.title}</span>
                    {cleared ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : null}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{m.briefing}</p>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <button
                      onClick={() => {
                        onAbortMission();
                        onClose();
                      }}
                      className="px-4 py-2 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-red-200 text-xs font-semibold"
                    >
                      Abort Active
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onStartMission(m.id);
                        onClose();
                      }}
                      className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap"
                    >
                      {cleared ? 'Replay Mission' : 'Start Mission'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
