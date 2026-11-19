// Zero-dependency Web Audio synthesizer for tactical audio feedback

class VaakAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainVal = 0.08) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio playback blocked by browser autoplay policy
    }
  }

  public playRogerBeep() {
    this.playTone(1380, 75, 'sine', 0.07);
    setTimeout(() => this.playTone(1760, 100, 'sine', 0.07), 85);
  }

  public playPttStart() {
    this.playTone(880, 60, 'triangle', 0.06);
  }

  public playSonarPing() {
    this.playTone(920, 220, 'sine', 0.08);
    setTimeout(() => this.playTone(1180, 280, 'sine', 0.05), 110);
  }

  public playSonicChirp() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(4800, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Ignore audio block
    }
  }

  public playSosPulse() {
    this.playTone(740, 160, 'square', 0.05);
    setTimeout(() => this.playTone(980, 220, 'square', 0.05), 200);
  }

  public playCallCutoff() {
    this.playTone(440, 140, 'sawtooth', 0.05);
    setTimeout(() => this.playTone(320, 220, 'sawtooth', 0.05), 160);
  }

  public playNotificationChime() {
    this.playTone(1046, 120, 'sine', 0.06);
    setTimeout(() => this.playTone(1318, 150, 'sine', 0.06), 130);
  }

  public playNormalRing() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch {
      // Ignore
    }
  }

  public playEmergencySosRingtone() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.15);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Ignore
    }
  }
}

export const audioEngine = new VaakAudioEngine();
