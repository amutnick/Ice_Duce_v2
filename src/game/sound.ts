export type SoundType = 'roll' | 'place' | 'bust' | 'bonus' | 'win';
export type SoundStatus = 'unsupported' | 'idle' | 'ready' | 'running' | 'blocked' | 'error';

type SoundEntry = {
  audio: HTMLAudioElement;
  lastPlayedAt: number;
};

const SOUND_SETTINGS: Record<SoundType, { frequency: number; duration: number; volume: number }> = {
  roll: { frequency: 440, duration: 0.16, volume: 0.12 },
  place: { frequency: 560, duration: 0.16, volume: 0.11 },
  bust: { frequency: 220, duration: 0.22, volume: 0.13 },
  bonus: { frequency: 660, duration: 0.18, volume: 0.12 },
  win: { frequency: 780, duration: 0.24, volume: 0.14 }
};

let primed = false;
let lastError: string | null = null;
const cache = new Map<SoundType, SoundEntry>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createToneUrl(frequency: number, durationSeconds: number, volume: number): string {
  const sampleRate = 44100;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const amplitude = Math.floor(32767 * clamp(volume, 0, 1));
  const attackSamples = Math.max(1, Math.floor(sampleCount * 0.05));
  const releaseSamples = Math.max(1, Math.floor(sampleCount * 0.12));

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / sampleRate;
    const envelope =
      index < attackSamples
        ? index / attackSamples
        : index > sampleCount - releaseSamples
          ? (sampleCount - index) / releaseSamples
          : 1;
    const harmonic = Math.sin(2 * Math.PI * frequency * t) * 0.72 +
      Math.sin(2 * Math.PI * frequency * 2 * t) * 0.18 +
      Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;
    const sample = Math.round(Math.sin(2 * Math.PI * frequency * t) * amplitude * envelope * 0.9 + harmonic * amplitude * envelope * 0.1);
    view.setInt16(44 + index * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getEntry(type: SoundType): SoundEntry {
  const cached = cache.get(type);
  if (cached) {
    return cached;
  }

  const settings = SOUND_SETTINGS[type];
  const audio = new Audio(createToneUrl(settings.frequency, settings.duration, settings.volume));
  audio.preload = 'auto';
  audio.volume = settings.volume;
  const entry = { audio, lastPlayedAt: 0 };
  cache.set(type, entry);
  return entry;
}

export function primeSound(): void {
  if (typeof window === 'undefined') {
    return;
  }

  primed = true;
  for (const type of Object.keys(SOUND_SETTINGS) as SoundType[]) {
    const { audio } = getEntry(type);
    audio.load();
  }
}

export function getSoundStatus(): SoundStatus {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  if (lastError) {
    return 'error';
  }

  if (!primed) {
    return 'idle';
  }

  const active = [...cache.values()].some((entry) => !entry.audio.paused && !entry.audio.ended);
  if (active) {
    return 'running';
  }

  return 'ready';
}

export function playSound(type: SoundType, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') {
    return;
  }

  primed = true;
  const { audio } = getEntry(type);
  const now = performance.now();
  if (now - getEntry(type).lastPlayedAt < 70) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  audio.volume = SOUND_SETTINGS[type].volume;
  audio.load();
  const playPromise = audio.play();
  getEntry(type).lastPlayedAt = now;

  if (playPromise) {
    playPromise.catch((error: unknown) => {
      lastError = error instanceof Error ? error.message : 'Unable to play sound effect.';
    });
  }
}
