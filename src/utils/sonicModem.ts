// Real Web Audio API BFSK Acoustic Wave Data Modem for Vaak / PingTalk
// Encodes short emergency messages into audio frequency pairs and decodes them live via Microphone FFT.

export type SonicBandMode = 'ultrasonic_18k' | 'audible_rescue';

interface BandConfig {
  label: string;
  preambleHz: number;
  freq0Hz: number; // Bit 0 (Space)
  freq1Hz: number; // Bit 1 (Mark)
  bitDurationMs: number;
  toleranceHz: number;
}

export const SONIC_BANDS: Record<SonicBandMode, BandConfig> = {
  ultrasonic_18k: {
    label: '18.5kHz Near-Ultrasonic',
    preambleHz: 17500,
    freq0Hz: 18150,
    freq1Hz: 18850,
    bitDurationMs: 42,
    toleranceHz: 180,
  },
  audible_rescue: {
    label: 'Audible Rescue (2.6/3.4kHz)',
    preambleHz: 2100,
    freq0Hz: 2650,
    freq1Hz: 3350,
    bitDurationMs: 36,
    toleranceHz: 160,
  },
};

function computeCrc8(bytes: Uint8Array): number {
  let crc = 0x00;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) {
      if ((crc & 0x80) !== 0) {
        crc = ((crc << 1) ^ 0x07) & 0xff;
      } else {
        crc = (crc << 1) & 0xff;
      }
    }
  }
  return crc;
}

export function encodeAcousticFrame(text: string): {
  bits: number[];
  byteLength: number;
  crcHex: string;
} {
  const encoder = new TextEncoder();
  const payload = encoder.encode(text.slice(0, 64));
  const crc = computeCrc8(payload);

  // Frame: [0xAA, 0x55, length, ...payload, crc]
  const frame = new Uint8Array(4 + payload.length);
  frame[0] = 0xaa;
  frame[1] = 0x55;
  frame[2] = payload.length;
  frame.set(payload, 3);
  frame[3 + payload.length] = crc;

  const bits: number[] = [];
  for (let i = 0; i < frame.length; i++) {
    const byte = frame[i];
    for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
      bits.push((byte >> bitIdx) & 1);
    }
  }

  return {
    bits,
    byteLength: payload.length,
    crcHex: crc.toString(16).padStart(2, '0').toUpperCase(),
  };
}

let activeTxCtx: AudioContext | null = null;

export async function transmitAcousticPacket(
  text: string,
  band: SonicBandMode,
  onProgress?: (pct: number) => void
): Promise<{ sentBytes: number; crcHex: string; durationMs: number }> {
  if (typeof window === 'undefined') {
    return { sentBytes: 0, crcHex: '00', durationMs: 0 };
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API unavailable in this browser.');
  }

  if (!activeTxCtx || activeTxCtx.state === 'closed') {
    activeTxCtx = new AudioCtx();
  }
  if (activeTxCtx.state === 'suspended') {
    await activeTxCtx.resume();
  }

  const ctx = activeTxCtx;
  const cfg = SONIC_BANDS[band];
  const { bits, byteLength, crcHex } = encodeAcousticFrame(text);
  const bitSec = cfg.bitDurationMs / 1000;
  const preambleSec = 0.14;
  const totalSec = preambleSec + bits.length * bitSec + 0.04;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';

  const startAt = ctx.currentTime + 0.03;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(0.28, startAt + 0.015);

  // Carrier wake-up preamble
  osc.frequency.setValueAtTime(cfg.preambleHz, startAt);

  // Schedule each encoded bit frequency cleanly
  let t = startAt + preambleSec;
  for (let i = 0; i < bits.length; i++) {
    const freq = bits[i] === 1 ? cfg.freq1Hz : cfg.freq0Hz;
    osc.frequency.setValueAtTime(freq, t);
    t += bitSec;
  }

  gain.gain.setValueAtTime(0.28, startAt + totalSec - 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + totalSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + totalSec + 0.01);

  const startMs = Date.now();
  const totalMs = Math.round(totalSec * 1000);

  return new Promise((resolve) => {
    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startMs;
      const pct = Math.min(99, Math.round((elapsed / Math.max(1, totalMs)) * 100));
      onProgress?.(pct);
    }, 60);

    osc.onended = () => {
      clearInterval(progressTimer);
      onProgress?.(100);
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup warnings
      }
      resolve({ sentBytes: byteLength, crcHex, durationMs: totalMs });
    };
  });
}

export interface SonicListenerHandle {
  stop: () => void;
}

export async function startAcousticListener(options: {
  band: SonicBandMode;
  onDecoded: (packet: { text: string; crcHex: string; band: SonicBandMode }) => void;
  onSignalLevel?: (level0to100: number, detectedHz: number) => void;
  onError?: (reason: string) => void;
}): Promise<SonicListenerHandle> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof window === 'undefined'
  ) {
    options.onError?.('Microphone capture API unavailable.');
    return { stop: () => {} };
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    options.onError?.('Web Audio API unavailable.');
    return { stop: () => {} };
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch (err) {
    options.onError?.(err instanceof Error ? err.message : 'Microphone permission denied.');
    return { stop: () => {} };
  }

  const ctx = new AudioCtx();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.15;
  source.connect(analyser);

  const cfg = SONIC_BANDS[options.band];
  const binHz = ctx.sampleRate / analyser.fftSize;
  const freqData = new Uint8Array(analyser.frequencyBinCount);

  const readBandMagnitude = (targetHz: number): number => {
    const minBin = Math.max(0, Math.floor((targetHz - cfg.toleranceHz) / binHz));
    const maxBin = Math.min(
      freqData.length - 1,
      Math.ceil((targetHz + cfg.toleranceHz) / binHz)
    );
    let peak = 0;
    for (let b = minBin; b <= maxBin; b++) {
      if (freqData[b] > peak) peak = freqData[b];
    }
    return peak;
  };

  let state: 'IDLE' | 'PREAMBLE' | 'READING' = 'IDLE';
  let bitBuffer: number[] = [];
  let nextSampleAt = 0;
  let preambleHits = 0;
  let stopped = false;

  const tryDecodeBitBuffer = () => {
    if (bitBuffer.length < 32) return;
    const byteCount = Math.floor(bitBuffer.length / 8);
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
      let val = 0;
      for (let b = 0; b < 8; b++) {
        val = (val << 1) | bitBuffer[i * 8 + b];
      }
      bytes[i] = val;
    }

    // Look for 0xAA 0x55 sync header
    if (bytes[0] !== 0xaa || bytes[1] !== 0x55) return;
    const len = bytes[2];
    if (len === 0 || len > 64 || bytes.length < 4 + len) return;

    const payload = bytes.slice(3, 3 + len);
    const receivedCrc = bytes[3 + len];
    const expectedCrc = computeCrc8(payload);

    if (receivedCrc === expectedCrc) {
      const text = new TextDecoder().decode(payload);
      options.onDecoded({
        text,
        crcHex: receivedCrc.toString(16).padStart(2, '0').toUpperCase(),
        band: options.band,
      });
      state = 'IDLE';
      bitBuffer = [];
      preambleHits = 0;
    }
  };

  const pollInterval = window.setInterval(() => {
    if (stopped) return;
    analyser.getByteFrequencyData(freqData);

    const pMag = readBandMagnitude(cfg.preambleHz);
    const m0 = readBandMagnitude(cfg.freq0Hz);
    const m1 = readBandMagnitude(cfg.freq1Hz);
    const strongest = Math.max(pMag, m0, m1);
    const detectedHz =
      strongest === m1 ? cfg.freq1Hz : strongest === m0 ? cfg.freq0Hz : cfg.preambleHz;
    options.onSignalLevel?.(Math.min(100, Math.round((strongest / 255) * 100)), detectedHz);

    const now = performance.now();

    if (state === 'IDLE') {
      if (pMag > 95 && pMag > m0 + 12 && pMag > m1 + 12) {
        preambleHits++;
        if (preambleHits >= 2) {
          state = 'PREAMBLE';
          bitBuffer = [];
        }
      } else {
        preambleHits = 0;
      }
    } else if (state === 'PREAMBLE') {
      // Transition cleanly when bit mark/space begins after preamble
      if ((m0 > 90 || m1 > 90) && Math.abs(m1 - m0) > 15) {
        state = 'READING';
        nextSampleAt = now + cfg.bitDurationMs * 0.5;
        bitBuffer = [m1 > m0 ? 1 : 0];
      } else if (pMag < 45) {
        state = 'IDLE';
        preambleHits = 0;
      }
    } else if (state === 'READING') {
      if (now >= nextSampleAt) {
        bitBuffer.push(m1 >= m0 ? 1 : 0);
        nextSampleAt += cfg.bitDurationMs;
        tryDecodeBitBuffer();
        if (bitBuffer.length > 8 * 70) {
          state = 'IDLE';
          bitBuffer = [];
          preambleHits = 0;
        }
      }
    }
  }, 10);

  return {
    stop: () => {
      stopped = true;
      clearInterval(pollInterval);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      stream.getTracks().forEach((tr) => tr.stop());
      ctx.close().catch(() => {});
    },
  };
}
