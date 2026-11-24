import React from 'react';
import type { SaveSlotData } from '../game/types';

interface TitleScreenProps {
  hasSave: boolean;
  latestSave: SaveSlotData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onOpenMissions: () => void;
  onOpenGarage: () => void;
  onOpenCharacter: () => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
  onOpenUnitySource: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  latestSave,
  onNewGame,
  onContinue,
  onOpenMissions,
  onOpenGarage,
  onOpenCharacter,
  onOpenMultiplayer,
  onOpenSettings,
  onOpenUnitySource,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 bg-gradient-to-r from-[#070a10]/90 via-[#070a10]/50 to-transparent">
      {/* Top quiet metadata strip */}
      <div className="flex items-center justify-between text-xs text-slate-300/90 tracking-wide">
        <div className="flex items-center gap-3">
          <span className="font-display font-semibold text-amber-400">AARYA INTERACTIVE</span>
          <span aria-hidden="true">·</span>
          <span>Kathmandu · Pokhara · Terai · Himalaya</span>
        </div>
        <button
          onClick={onOpenUnitySource}
          className="px-3 py-1.5 rounded border border-white/15 bg-[#0f1623]/90 hover:bg-[#182235] text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
        >
          Unity 6 Source & Android Build
        </button>
      </div>

      {/* Main Title Lockup & Menu */}
      <div className="max-w-xl my-auto">
        {/* Bespoke inline SVG Lockup */}
        <svg
          viewBox="0 0 520 112"
          className="w-full max-w-[460px] h-auto mb-3 drop-shadow-[0_4px_20px_rgba(0,0,0,0.75)]"
          role="img"
          aria-label="AARYA CITY"
        >
          <defs>
            <linearGradient id="aaryaGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          {/* Himalayan ridge emblem */}
          <path
            d="M8 84 L42 30 L64 60 L88 20 L124 84 Z"
            fill="none"
            stroke="url(#aaryaGold)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M74 42 L88 20 L102 42 L93 38 L88 44 L83 38 Z" fill="#f8fafc" />
          <text
            x="140"
            y="58"
            fill="#f8fafc"
            fontFamily="Oxanium, sans-serif"
            fontWeight="800"
            fontSize="48"
            letterSpacing="3"
          >
            AARYA
          </text>
          <text
            x="142"
            y="92"
            fill="url(#aaryaGold)"
            fontFamily="Oxanium, sans-serif"
            fontWeight="700"
            fontSize="26"
            letterSpacing="11"
          >
            CITY
          </text>
        </svg>

        <p className="text-sm md:text-base text-slate-300 max-w-md mb-7 leading-relaxed">
          Explore a seamless Nepal-inspired open world across ancient Newari plazas, lakeside highways, Terai bazaars, and Himalayan switchbacks.
        </p>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-col gap-2.5 max-w-xs">
          {hasSave && latestSave ? (
            <button
              onClick={onContinue}
              className="w-full py-3 px-5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base tracking-wide transition-colors text-left flex items-center justify-between"
            >
              <span>Continue Offline Story</span>
              <span className="text-xs font-mono-tabular opacity-80">
                Lvl {latestSave.progress.level}
              </span>
            </button>
          ) : null}

          <button
            onClick={onNewGame}
            className={`w-full py-3 px-5 rounded font-display font-bold text-base tracking-wide transition-colors text-left flex items-center justify-between ${
              hasSave
                ? 'bg-[#121a28]/95 hover:bg-[#1b263a] text-slate-100 border border-white/15'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <span>{hasSave ? 'New Game (Free Roam & Story)' : 'Start Game'}</span>
            <span className="text-xs opacity-75">Enter</span>
          </button>

          <button
            onClick={onOpenMultiplayer}
            className="w-full py-2.5 px-5 rounded bg-[#121a28]/95 hover:bg-[#1b263a] text-cyan-300 border border-cyan-500/30 font-medium text-sm transition-colors text-left flex items-center justify-between"
          >
            <span>Online Co-op Multiplayer</span>
            <span className="text-xs text-slate-400">Room / Code</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onOpenMissions}
              className="py-2 px-3 rounded bg-[#0f1623]/90 hover:bg-[#1a2438] text-slate-200 border border-white/10 text-xs font-medium transition-colors"
            >
              Missions
            </button>
            <button
              onClick={onOpenGarage}
              className="py-2 px-3 rounded bg-[#0f1623]/90 hover:bg-[#1a2438] text-slate-200 border border-white/10 text-xs font-medium transition-colors"
            >
              Garage
            </button>
            <button
              onClick={onOpenCharacter}
              className="py-2 px-3 rounded bg-[#0f1623]/90 hover:bg-[#1a2438] text-slate-200 border border-white/10 text-xs font-medium transition-colors"
            >
              Character
            </button>
            <button
              onClick={onOpenSettings}
              className="py-2 px-3 rounded bg-[#0f1623]/90 hover:bg-[#1a2438] text-slate-200 border border-white/10 text-xs font-medium transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Flat single-line control hint */}
      <div className="text-xs text-slate-300/80 font-mono-tabular">
        WASD Move · F Enter Vehicle · Space Jump / Handbrake · Click Attack · 1-4 Weapons · M Map · Esc Pause
      </div>
    </div>
  );
};
