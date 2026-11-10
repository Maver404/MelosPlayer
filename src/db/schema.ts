import Dexie, { type Table } from 'dexie';

export type StorageBackend = 'opfs' | 'idb';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  trackNo?: number;
  discNo?: number;
  /** Seconds. */
  duration: number;
  /** Short label shown in the UI, e.g. "FLAC", "MP3". */
  format: string;
  mime: string;
  lossless?: boolean;
  sampleRate?: number;
  bitsPerSample?: number;
  size: number;
  fileName: string;
  coverId?: string;
  storage: StorageBackend;
  /** Fingerprint used to skip duplicates on re-import. */
  hash: string;
  addedAt: number;
  lastPlayedAt?: number;
  playCount?: number;
}

export interface Cover {
  id: string;
  blob: Blob;
  /** Dominant color of the artwork (hex), used to tint the UI. */
  color?: string;
}

/** Audio blobs, used only when OPFS is not writable on this device. */
export interface StoredBlob {
  id: string;
  blob: Blob;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Favorite {
  trackId: string;
  addedAt: number;
}

class MelosDB extends Dexie {
  tracks!: Table<Track, string>;
  covers!: Table<Cover, string>;
  blobs!: Table<StoredBlob, string>;
  playlists!: Table<Playlist, string>;
  favorites!: Table<Favorite, string>;

  constructor() {
    super('melos');
    this.version(1).stores({
      tracks: 'id, hash, album, artist, addedAt',
      covers: 'id',
      blobs: 'id',
      playlists: 'id, updatedAt',
      favorites: 'trackId, addedAt',
    });
    this.version(2).stores({
      tracks: 'id, hash, album, artist, addedAt, lastPlayedAt',
    });
  }
}

export const db = new MelosDB();
