const TRACKS = [
  new URL('../../Audio/Background/Starlit Farmstead Loop.mp3', import.meta.url).href,
  new URL('../../Audio/Background/Starfield Homestead.mp3', import.meta.url).href,
  new URL('../../Audio/Background/Stargarden Pathways (1).mp3', import.meta.url).href,
  new URL('../../Audio/Background/Starglen Farm Path.mp3', import.meta.url).href
];

const DEFAULT_VOLUME = 0.18;
const FADE_DURATION_MS = 1400;
const CROSSFADE_SECONDS = 6;
const TICK_MS = 160;

export type BackgroundMusicStatus = 'unsupported' | 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type ControllerState = {
  current: HTMLAudioElement | null;
  next: HTMLAudioElement | null;
  currentIndex: number;
  playing: boolean;
  muted: boolean;
  volume: number;
  loading: boolean;
  error: string | null;
  fadeTimer: number | null;
  advanceTimer: number | null;
  fadeStart: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(value: number): number {
  const clamped = clamp(value, 0, 1);
  return 0.5 - Math.cos(clamped * Math.PI) / 2;
}

function createTrack(src: string, volume: number, muted: boolean): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.loop = false;
  audio.volume = volume;
  audio.muted = muted;
  return audio;
}

class BackgroundMusicController {
  private state: ControllerState = {
    current: null,
    next: null,
    currentIndex: 0,
    playing: false,
    muted: false,
    volume: DEFAULT_VOLUME,
    loading: false,
    error: null,
    fadeTimer: null,
    advanceTimer: null,
    fadeStart: null
  };

  start(volume: number, muted: boolean): Promise<void> {
    this.state.volume = clamp(volume, 0, 1);
    this.state.muted = muted;
    this.state.error = null;
    this.state.playing = true;
    this.state.loading = true;
    this.ensureCurrent();
    this.applyTrackSettings(this.state.current);
    this.applyTrackSettings(this.state.next);

    return this.playCurrent().finally(() => {
      this.state.loading = false;
      this.scheduleTick();
    });
  }

  pause(): void {
    this.state.playing = false;
    this.clearTimers();
    this.pauseAndReset(this.state.current, false);
    this.pauseAndReset(this.state.next, false);
    this.state.next = null;
  }

  stop(): void {
    this.state.playing = false;
    this.state.loading = false;
    this.state.error = null;
    this.clearTimers();
    this.pauseAndReset(this.state.current, true);
    this.pauseAndReset(this.state.next, true);
    this.state.current = null;
    this.state.next = null;
    this.state.currentIndex = 0;
    this.state.fadeStart = null;
  }

  setVolume(volume: number): void {
    this.state.volume = clamp(volume, 0, 1);
    this.applyTrackSettings(this.state.current);
    this.applyTrackSettings(this.state.next);
  }

  setMuted(muted: boolean): void {
    this.state.muted = muted;
    this.applyTrackSettings(this.state.current);
    this.applyTrackSettings(this.state.next);
  }

  sync(active: boolean): void {
    if (!active) {
      this.pause();
    }
  }

  getStatus(): BackgroundMusicStatus {
    if (typeof window === 'undefined') {
      return 'unsupported';
    }

    if (this.state.error) {
      return 'error';
    }

    if (this.state.loading) {
      return 'loading';
    }

    if (this.state.playing) {
      return 'playing';
    }

    return this.state.current ? 'paused' : 'idle';
  }

  private ensureCurrent(): HTMLAudioElement {
    if (!this.state.current) {
      this.state.current = createTrack(TRACKS[0] ?? TRACKS[0]!, this.state.volume, this.state.muted);
      this.state.current.onended = () => this.handleEnded();
      this.state.currentIndex = 0;
    }

    return this.state.current;
  }

  private ensureNext(): HTMLAudioElement {
    if (this.state.next) {
      return this.state.next;
    }

    const nextIndex = (this.state.currentIndex + 1) % TRACKS.length;
    this.state.next = createTrack(TRACKS[nextIndex] ?? TRACKS[0]!, 0, this.state.muted);
    this.state.next.onended = () => this.handleEnded();
    return this.state.next;
  }

  private applyTrackSettings(audio: HTMLAudioElement | null): void {
    if (!audio) {
      return;
    }

    audio.volume = this.state.muted ? 0 : this.state.volume;
    audio.muted = this.state.muted;
  }

  private pauseAndReset(audio: HTMLAudioElement | null, reset = false): void {
    if (!audio) {
      return;
    }

    try {
      audio.pause();
      if (reset) {
        audio.currentTime = 0;
      }
    } catch {
      // Ignore cleanup issues.
    }
  }

  private clearTimers(): void {
    if (this.state.fadeTimer !== null) {
      window.clearTimeout(this.state.fadeTimer);
      this.state.fadeTimer = null;
    }
    if (this.state.advanceTimer !== null) {
      window.clearTimeout(this.state.advanceTimer);
      this.state.advanceTimer = null;
    }
  }

  private async playCurrent(): Promise<void> {
    const current = this.ensureCurrent();
    this.applyTrackSettings(current);

    try {
      await current.play();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unable to start background music.';
      this.state.playing = false;
      return;
    }

    this.state.playing = true;
  }

  private scheduleTick(): void {
    this.clearTimers();
    if (!this.state.playing || !this.state.current) {
      return;
    }

    this.state.advanceTimer = window.setTimeout(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    this.state.advanceTimer = null;

    if (!this.state.playing || !this.state.current) {
      return;
    }

    const current = this.state.current;
    if (!Number.isFinite(current.duration) || current.duration <= 0) {
      this.scheduleTick();
      return;
    }

    const remaining = current.duration - current.currentTime;
    if (remaining <= CROSSFADE_SECONDS && !this.state.next) {
      void this.startCrossfade();
      return;
    }

    this.scheduleTick();
  }

  private async startCrossfade(): Promise<void> {
    if (!this.state.playing || !this.state.current) {
      return;
    }

    const current = this.state.current;
    const next = this.ensureNext();
    this.applyTrackSettings(next);
    next.volume = 0;

    try {
      await next.play();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unable to start background music.';
      this.pause();
      return;
    }

    const start = performance.now();
    this.state.fadeStart = start;

    const fade = () => {
      if (!this.state.current || this.state.next !== next) {
        return;
      }

      const progress = (performance.now() - start) / FADE_DURATION_MS;
      const eased = easeInOut(progress);
      const volume = this.state.muted ? 0 : this.state.volume;
      current.volume = volume * (1 - eased);
      next.volume = volume * eased;

      if (progress < 1) {
        this.state.fadeTimer = window.setTimeout(fade, 32);
        return;
      }

      this.pauseAndReset(current, true);
      this.state.current = next;
      this.state.currentIndex = (this.state.currentIndex + 1) % TRACKS.length;
      this.state.next = null;
      this.state.fadeTimer = null;
      this.scheduleTick();
    };

    fade();
  }

  private handleEnded(): void {
    if (!this.state.playing || !this.state.current) {
      return;
    }

    if (this.state.next) {
      return;
    }

    void this.startCrossfade();
  }
}

const controller = new BackgroundMusicController();

export function startBackgroundMusic(volume: number, muted: boolean): Promise<void> {
  return controller.start(volume, muted);
}

export function pauseBackgroundMusic(): void {
  controller.pause();
}

export function stopBackgroundMusic(): void {
  controller.stop();
}

export function setBackgroundMusicVolume(volume: number): void {
  controller.setVolume(volume);
}

export function setBackgroundMusicMuted(muted: boolean): void {
  controller.setMuted(muted);
}

export function syncBackgroundMusic(active: boolean): void {
  controller.sync(active);
}

export function getBackgroundMusicStatus(): BackgroundMusicStatus {
  return controller.getStatus();
}
