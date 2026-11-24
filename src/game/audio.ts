import type { AudioSettings, VehicleCategory } from './types';

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private musicTimer: number | null = null;

  private settings: AudioSettings = {
    muted: false,
    master: 0.75,
    music: 0.45,
    sfx: 0.8,
    engine: 0.65,
  };

  private initialized = false;
  private stepTimer = 0;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.engineGain = ctx.createGain();
    this.musicGain = ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.engineGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // Continuous Engine Synth
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    this.engineSubOsc = ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 28;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;

    const engineVol = ctx.createGain();
    engineVol.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(engineVol);
    engineVol.connect(this.engineGain);

    this.engineOsc.start();
    this.engineSubOsc.start();
    (this.engineFilter as unknown as { _vol: GainNode })._vol = engineVol;

    // Continuous Police Siren Node
    this.sirenOsc = ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start();

    // Rain Noise Buffer
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.rainNoiseNode = ctx.createBufferSource();
    this.rainNoiseNode.buffer = buffer;
    this.rainNoiseNode.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1100;
    rainFilter.Q.value = 0.7;

    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainNoiseNode.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.sfxGain);
    this.rainNoiseNode.start();

    this.initialized = true;
    this.applySettings(this.settings);
    this.startAmbientMusicLoop();
  }

  public applySettings(next: AudioSettings): void {
    this.settings = { ...next };
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.engineGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(next.muted ? 0 : next.master, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(next.sfx, now, 0.05);
    this.engineGain.gain.setTargetAtTime(next.engine, now, 0.05);
    this.musicGain.gain.setTargetAtTime(next.music * 0.25, now, 0.05);
  }

  private startAmbientMusicLoop(): void {
    if (this.musicTimer !== null) return;
    // Himalayan pentatonic motif: D4, F4, G4, A4, C5, D5
    const scale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.settings.muted || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = scale[(step * 3 + (step % 2)) % scale.length];
      step++;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 2.5);
    }, 2100);
  }

  public updateEngine(active: boolean, speedRatio: number, category: VehicleCategory | null): void {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineFilter) return;
    const vol = (this.engineFilter as unknown as { _vol?: GainNode })._vol;
    if (!vol) return;
    const now = this.ctx.currentTime;

    if (!active) {
      vol.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const baseFreq =
      category === 'helicopter'
        ? 44
        : category === 'motorcycle' || category === 'scooter'
          ? 78
          : category === 'bus' || category === 'truck'
            ? 38
            : 52;

    const clamped = Math.min(1.2, Math.max(0, speedRatio));
    const targetFreq = baseFreq + clamped * (category === 'supercar' ? 140 : 95);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(160 + clamped * 480, now, 0.06);
    vol.gain.setTargetAtTime(0.09 + clamped * 0.09, now, 0.08);
  }

  public updateSiren(active: boolean, elapsedTime: number): void {
    if (!this.ctx || !this.sirenOsc || !this.sirenGain) return;
    const now = this.ctx.currentTime;
    if (!active) {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    const sweep = 620 + Math.sin(elapsedTime * 5.2) * 210;
    this.sirenOsc.frequency.setTargetAtTime(sweep, now, 0.04);
    this.sirenGain.gain.setTargetAtTime(0.055, now, 0.06);
  }

  public updateRainAmbience(intensity: number): void {
    if (!this.ctx || !this.rainGain) return;
    this.rainGain.gain.setTargetAtTime(intensity * 0.12, this.ctx.currentTime, 0.25);
  }

  public updateFootstep(dt: number, moving: boolean, sprinting: boolean): void {
    if (!moving || !this.ctx || !this.sfxGain) {
      this.stepTimer = 0;
      return;
    }
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = sprinting ? 0.28 : 0.44;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(125 + Math.random() * 25, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  public playUiClick(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playHorn(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    [340, 425].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.setValueAtTime(0.09, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  public playWeapon(isMelee: boolean): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (isMelee) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.11);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  }

  public playImpact(strength = 1): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
    gain.gain.setValueAtTime(Math.min(0.32, 0.16 * strength), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playRewardChime(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  public playThunder(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(68, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.1);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  public dispose(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

export const gameAudio = new GameAudioEngine();
