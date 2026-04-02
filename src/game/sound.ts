export type SoundType = 'roll' | 'place' | 'bust' | 'bonus' | 'win';

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioContext) {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) {
      return null;
    }
    audioContext = new Context();
  }

  return audioContext;
}

export function playSound(type: SoundType, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const context = getContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  const frequencies: Record<SoundType, number> = {
    roll: 440,
    place: 560,
    bust: 220,
    bonus: 660,
    win: 780
  };

  oscillator.type = type === 'bust' ? 'sawtooth' : 'triangle';
  oscillator.frequency.setValueAtTime(frequencies[type], now);
  oscillator.frequency.exponentialRampToValueAtTime(frequencies[type] * 1.2, now + 0.12);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}
