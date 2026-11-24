import React, { useState } from 'react';
import { Save, Sliders, X } from 'lucide-react';
import type {
  GameSettings,
  GraphicsPreset,
  SaveSlotData,
  WeatherType,
} from '../game/types';

interface PauseSettingsModalProps {
  isPlaying: boolean;
  settings: GameSettings;
  weather: WeatherType;
  timeOfDay: number;
  fps: number;
  saveSlots: Array<{ slotId: string; data: SaveSlotData | null }>;
  onResume: () => void;
  onUpdateSettings: (next: GameSettings) => void;
  onSetWeather: (w: WeatherType) => void;
  onSetTimeOfDay: (hour: number) => void;
  onSaveSlot: (slotId: string) => void;
  onLoadSlot: (slotId: string) => void;
  onReturnToTitle: () => void;
  onClose: () => void;
}

const WEATHERS: WeatherType[] = [
  'sunny',
  'cloudy',
  'rain',
  'heavy_rain',
  'fog',
  'thunderstorm',
  'snow',
];

export const PauseSettingsModal: React.FC<PauseSettingsModalProps> = ({
  isPlaying,
  settings,
  weather,
  timeOfDay,
  fps,
  saveSlots,
  onResume,
  onUpdateSettings,
  onSetWeather,
  onSetTimeOfDay,
  onSaveSlot,
  onLoadSlot,
  onReturnToTitle,
  onClose,
}) => {
  const [tab, setTab] = useState<'general' | 'saves'>('general');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-2xl max-h-[88vh] bg-[#0e1420] border border-white/15 rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg text-slate-100">
              {isPlaying ? 'Pause & Game Settings' : 'System Settings'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('general')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                tab === 'general' ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Graphics & Audio
            </button>
            <button
              onClick={() => setTab('saves')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                tab === 'saves' ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Save / Load
            </button>
            <button
              onClick={isPlaying ? onResume : onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {tab === 'general' ? (
            <>
              {/* Graphics Preset + Benchmark readout */}
              <div className="p-3.5 rounded bg-[#141c2c] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Graphics Quality Preset
                  </span>
                  <span className="text-xs font-mono-tabular text-cyan-300">
                    Live Render: {fps} FPS
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'ultra'] as GraphicsPreset[]).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => onUpdateSettings({ ...settings, graphics: tier })}
                      className={`py-1.5 rounded text-xs font-semibold uppercase ${
                        settings.graphics === tier
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-[#090d16] text-slate-300 border border-white/10'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather & Time Controls */}
              <div className="p-3.5 rounded bg-[#141c2c] border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Dynamic Weather</span>
                  <select
                    value={weather}
                    onChange={(e) => onSetWeather(e.target.value as WeatherType)}
                    className="px-2.5 py-1 rounded bg-[#090d16] border border-white/15 text-xs text-slate-100 capitalize"
                  >
                    {WEATHERS.map((w) => (
                      <option key={w} value={w}>
                        {w.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>Time of Day</span>
                    <span className="font-mono-tabular">{Math.floor(timeOfDay)}:00</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={23.9}
                    step={0.5}
                    value={timeOfDay}
                    onChange={(e) => onSetTimeOfDay(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              {/* Audio & Controls */}
              <div className="p-3.5 rounded bg-[#141c2c] border border-white/10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">On-Screen Mobile Touch Controls</span>
                  <button
                    onClick={() =>
                      onUpdateSettings({ ...settings, touchControls: !settings.touchControls })
                    }
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      settings.touchControls
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {settings.touchControls ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {(['master', 'music', 'sfx', 'engine'] as const).map((ch) => (
                  <div key={ch} className="flex items-center gap-3 text-xs">
                    <span className="w-20 capitalize text-slate-400">{ch} Vol</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings.audio[ch]}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          audio: { ...settings.audio, [ch]: Number(e.target.value) },
                        })
                      }
                      className="flex-1 accent-amber-400"
                    />
                    <span className="w-10 text-right font-mono-tabular text-slate-300">
                      {Math.round(settings.audio[ch] * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              {saveSlots.map(({ slotId, data }) => (
                <div
                  key={slotId}
                  className="p-3.5 rounded bg-[#141c2c] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-display font-bold text-slate-100 uppercase">
                      {slotId.replace('_', ' ')}
                    </div>
                    {data ? (
                      <div className="text-[11px] text-slate-400 font-mono-tabular mt-0.5">
                        {data.customization.name} · Lvl {data.progress.level} · NPR{' '}
                        {data.progress.money.toLocaleString()} ·{' '}
                        {new Date(data.savedAt).toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 mt-0.5">Empty Slot</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPlaying ? (
                      <button
                        onClick={() => onSaveSlot(slotId)}
                        className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    ) : null}
                    {data ? (
                      <button
                        onClick={() => onLoadSlot(slotId)}
                        className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
                      >
                        Load
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isPlaying ? (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={onReturnToTitle}
                className="px-4 py-2 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 text-xs font-semibold"
              >
                Return to Main Menu
              </button>
              <button
                onClick={onResume}
                className="px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs"
              >
                Resume Game
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
