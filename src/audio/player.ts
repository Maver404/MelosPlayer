import { db, type Track } from '../db/schema';
import { log } from '../diagnostics/log';
import { loadAudio } from '../library/storage';
import { nextIndex, nextRepeat, prevIndex, shuffled, type RepeatMode } from './queue';

export interface PlayerState {
  /** Track ids in play order (shuffled when shuffle is on). */
  queue: string[];
  index: number;
  current?: Track;
  playing: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** True when an AirPlay receiver is reachable (Safari only). */
  airplayAvailable: boolean;
  /** True while audio is going to an AirPlay device. */
  airplayActive: boolean;
  error?: string;
}

type Listener = () => void;

const SESSION_KEY = 'melos-session';

interface Session {
  queue: string[];
  baseQueue: string[];
  index: number;
  position: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

/** Called after a track starts, e.g. to update play counts. */
export type PlayHook = (trackId: string) => void;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export class Player {
  readonly audio: HTMLAudioElement;
  private state: PlayerState = {
    queue: [],
    index: -1,
    playing: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',
    airplayAvailable: false,
    airplayActive: false,
  };
  /** Queue in its original order, restored when shuffle is turned off. */
  private baseQueue: string[] = [];
  private listeners = new Set<Listener>();
  private objectUrl?: string;
  private loadSeq = 0;
  private lastSave = 0;
  private pendingSeek: number | null = null;
  onPlay?: PlayHook;

  constructor() {
    const a = document.createElement('audio');
    a.preload = 'auto';
    a.setAttribute('playsinline', '');
    a.setAttribute('x-webkit-airplay', 'allow');
    document.body.appendChild(a);
    this.audio = a;

    a.addEventListener('play', () => this.set({ playing: true }));
    a.addEventListener('pause', () => this.set({ playing: false }));
    a.addEventListener('timeupdate', () => {
      this.set({ position: a.currentTime });
      if (Date.now() - this.lastSave > 5000) this.saveSession();
    });
    a.addEventListener('loadedmetadata', () => {
      this.set({ duration: Number.isFinite(a.duration) ? a.duration : this.state.current?.duration ?? 0 });
      if (this.pendingSeek !== null) {
        a.currentTime = this.pendingSeek;
        this.set({ position: this.pendingSeek });
        this.pendingSeek = null;
      }
      this.updatePositionState();
    });
    a.addEventListener('pause', () => this.saveSession());
    a.addEventListener('seeked', () => this.updatePositionState());
    a.addEventListener('ended', () => {
      log('ended', { title: this.state.current?.title, visibility: document.visibilityState });
      void this.next(true);
    });
    a.addEventListener('error', () => {
      const msg = a.error ? `errore media ${a.error.code}` : 'errore media';
      log('error', { title: this.state.current?.title, msg });
      this.set({ error: `Impossibile riprodurre “${this.state.current?.title ?? ''}” (${msg})` });
    });
    a.addEventListener('webkitplaybacktargetavailabilitychanged', (e: Event) => {
      const available = (e as Event & { availability?: string }).availability === 'available';
      this.set({ airplayAvailable: available });
    });
    a.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
      const wireless = !!(a as HTMLAudioElement & { webkitCurrentPlaybackTargetIsWireless?: boolean })
        .webkitCurrentPlaybackTargetIsWireless;
      log('airplay', wireless ? 'attivo' : 'disattivo');
      this.set({ airplayActive: wireless });
    });

    this.setupMediaSession();
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): PlayerState => this.state;

  private set(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    if ('queue' in patch || 'index' in patch || 'shuffle' in patch || 'repeat' in patch) this.saveSession();
    this.listeners.forEach((l) => l());
    if ('playing' in patch && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.state.playing ? 'playing' : 'paused';
    }
  }

  /** Starts playing `ids` from `startIndex`. */
  async playQueue(ids: string[], startIndex = 0) {
    this.baseQueue = [...ids];
    const startId = ids[startIndex];
    const queue = this.state.shuffle ? shuffled(ids, startId) : [...ids];
    this.set({ queue });
    await this.loadIndex(queue.indexOf(startId), true);
  }

  private async loadIndex(index: number, autoplay: boolean) {
    const id = this.state.queue[index];
    if (id === undefined) return;
    const seq = ++this.loadSeq;
    const track = await db.tracks.get(id);
    if (!track || seq !== this.loadSeq) return;
    const blob = await loadAudio(track);
    if (seq !== this.loadSeq) return;

    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(blob);
    this.audio.src = this.objectUrl;
    this.set({ index, current: track, position: 0, duration: track.duration, error: undefined });
    void this.updateMetadata(track);

    if (autoplay) {
      try {
        await this.audio.play();
        this.onPlay?.(track.id);
        log('play ok', { title: track.title, visibility: document.visibilityState });
      } catch (err) {
        log('play rifiutato', { title: track.title, visibility: document.visibilityState, err: String(err) });
        this.set({ playing: false });
      }
    }
  }

  /** Jumps to a position in the current queue. */
  async jumpTo(index: number) {
    if (index >= 0 && index < this.state.queue.length) await this.loadIndex(index, true);
  }

  /** Inserts tracks right after the current one. */
  playNext(ids: string[]) {
    if (!this.state.queue.length) return this.playQueue(ids, 0);
    const queue = [...this.state.queue];
    queue.splice(this.state.index + 1, 0, ...ids);
    const base = [...this.baseQueue];
    const curId = this.state.queue[this.state.index];
    base.splice(base.indexOf(curId) + 1, 0, ...ids);
    this.baseQueue = base;
    this.set({ queue });
  }

  /** Appends tracks to the end of the queue. */
  addToQueue(ids: string[]) {
    if (!this.state.queue.length) return this.playQueue(ids, 0);
    this.baseQueue = [...this.baseQueue, ...ids];
    this.set({ queue: [...this.state.queue, ...ids] });
  }

  /** Removes one queue entry (not the one playing). */
  removeAt(index: number) {
    if (index === this.state.index || index < 0 || index >= this.state.queue.length) return;
    const id = this.state.queue[index];
    const queue = this.state.queue.filter((_, i) => i !== index);
    const bi = this.baseQueue.indexOf(id);
    if (bi !== -1) this.baseQueue = this.baseQueue.filter((_, i) => i !== bi);
    this.set({ queue, index: index < this.state.index ? this.state.index - 1 : this.state.index });
  }

  /** Drops tracks that were deleted from the library. */
  removeTracks(ids: string[]) {
    const gone = new Set(ids);
    const currentId = this.state.queue[this.state.index];
    if (currentId && gone.has(currentId)) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.set({ current: undefined, playing: false, position: 0, duration: 0 });
    }
    this.baseQueue = this.baseQueue.filter((id) => !gone.has(id));
    const queue = this.state.queue.filter((id) => !gone.has(id));
    const index = currentId && !gone.has(currentId) ? queue.indexOf(currentId) : -1;
    this.set({ queue, index });
  }

  private saveSession() {
    this.lastSave = Date.now();
    const s: Session = {
      queue: this.state.queue,
      baseQueue: this.baseQueue,
      index: this.state.index,
      position: this.audio.currentTime || 0,
      shuffle: this.state.shuffle,
      repeat: this.state.repeat,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {
      // storage unavailable
    }
  }

  /** Restores the last queue, paused at the last position. */
  async restoreSession() {
    let s: Session | null = null;
    try {
      s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    } catch {
      s = null;
    }
    if (!s || !s.queue?.length) return;
    const existing = new Set(await db.tracks.bulkGet(s.queue).then((ts) => ts.filter(Boolean).map((t) => t!.id)));
    const queue = s.queue.filter((id) => existing.has(id));
    if (!queue.length) return;
    const currentId = s.queue[s.index];
    this.baseQueue = (s.baseQueue ?? s.queue).filter((id) => existing.has(id));
    this.state = { ...this.state, queue, shuffle: !!s.shuffle, repeat: s.repeat ?? 'off' };
    const index = Math.max(0, queue.indexOf(currentId));
    this.pendingSeek = s.position > 0 ? s.position : null;
    await this.loadIndex(index, false);
  }

  async play() {
    if (!this.state.current && this.state.queue.length) return this.loadIndex(0, true);
    try {
      await this.audio.play();
    } catch (err) {
      log('play rifiutato', String(err));
    }
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    return this.state.playing ? this.pause() : this.play();
  }

  async next(auto = false) {
    const i = nextIndex(this.state.queue.length, this.state.index, this.state.repeat, auto);
    if (i === null) {
      this.pause();
      this.audio.currentTime = 0;
      return;
    }
    if (i === this.state.index) {
      this.audio.currentTime = 0;
      return this.play();
    }
    return this.loadIndex(i, true);
  }

  async prev() {
    const i = prevIndex(this.state.queue.length, this.state.index, this.audio.currentTime);
    if (i === null) return;
    if (i === this.state.index) {
      this.seek(0);
      return;
    }
    return this.loadIndex(i, true);
  }

  seek(sec: number) {
    if (!Number.isFinite(sec)) return;
    this.audio.currentTime = Math.max(0, Math.min(sec, this.state.duration || sec));
    this.set({ position: this.audio.currentTime });
  }

  toggleShuffle() {
    const shuffle = !this.state.shuffle;
    const currentId = this.state.queue[this.state.index];
    const queue = shuffle ? shuffled(this.baseQueue, currentId) : [...this.baseQueue];
    this.set({ shuffle, queue, index: currentId ? queue.indexOf(currentId) : -1 });
  }

  cycleRepeat() {
    this.set({ repeat: nextRepeat(this.state.repeat) });
  }

  /** Opens the AirPlay picker on iOS/macOS Safari, or the Cast picker on Android Chrome. */
  async showDevicePicker(): Promise<boolean> {
    const a = this.audio as HTMLAudioElement & {
      webkitShowPlaybackTargetPicker?: () => void;
      remote?: { prompt: () => Promise<void> };
    };
    if (a.webkitShowPlaybackTargetPicker) {
      a.webkitShowPlaybackTargetPicker();
      return true;
    }
    if (a.remote?.prompt) {
      try {
        await a.remote.prompt();
        return true;
      } catch (err) {
        log('remote playback', String(err));
      }
    }
    return false;
  }

  private async updateMetadata(track: Track) {
    if (!('mediaSession' in navigator)) return;
    let artwork: MediaImage[] = [];
    if (track.coverId) {
      const cover = await db.covers.get(track.coverId);
      if (cover) artwork = [{ src: await blobToDataUrl(cover.blob), sizes: '512x512', type: cover.blob.type || 'image/jpeg' }];
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork,
    });
  }

  private updatePositionState() {
    const ms = navigator.mediaSession;
    if (!ms?.setPositionState) return;
    const duration = this.audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
      ms.setPositionState({
        duration,
        playbackRate: this.audio.playbackRate,
        position: Math.min(this.audio.currentTime, duration),
      });
    } catch {
      // some browsers reject while the element is still loading
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void this.play()],
      ['pause', () => this.pause()],
      ['previoustrack', () => void this.prev()],
      ['nexttrack', () => void this.next()],
      ['seekto', (d) => d.seekTime !== undefined && this.seek(d.seekTime)],
      ['seekbackward', (d) => this.seek(this.audio.currentTime - (d.seekOffset ?? 10))],
      ['seekforward', (d) => this.seek(this.audio.currentTime + (d.seekOffset ?? 10))],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // action not supported on this browser
      }
    }
  }
}

let instance: Player | null = null;

export function getPlayer(): Player {
  if (!instance) instance = new Player();
  return instance;
}
