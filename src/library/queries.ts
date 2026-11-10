import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Playlist, type Track } from '../db/schema';

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number;
  coverId?: string;
  tracks: Track[];
  duration: number;
  addedAt: number;
  lastPlayedAt: number;
  formats: string[];
}

export interface Artist {
  id: string;
  name: string;
  albums: Album[];
  tracks: Track[];
  coverId?: string;
}

export interface Library {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  albumById: Map<string, Album>;
  artistById: Map<string, Artist>;
  loaded: boolean;
}

/** Short stable id from a string (FNV-1a), safe to put in a URL hash. */
export function keyId(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function albumIdOf(t: Pick<Track, 'album' | 'albumArtist' | 'artist'>): string {
  return keyId(`${(t.albumArtist ?? t.artist).toLowerCase()}\u0000${t.album.toLowerCase()}`);
}

export function artistIdOf(name: string): string {
  return keyId(name.toLowerCase());
}

export function compareAlbumOrder(a: Track, b: Track): number {
  return (a.discNo ?? 1) - (b.discNo ?? 1) || (a.trackNo ?? 999) - (b.trackNo ?? 999) || a.title.localeCompare(b.title, 'it');
}

export function buildLibrary(tracks: Track[]): Omit<Library, 'loaded'> {
  const albumMap = new Map<string, Album>();
  for (const t of tracks) {
    const id = albumIdOf(t);
    let al = albumMap.get(id);
    if (!al) {
      al = {
        id,
        title: t.album,
        artist: t.albumArtist ?? t.artist,
        year: t.year,
        coverId: t.coverId,
        tracks: [],
        duration: 0,
        addedAt: 0,
        lastPlayedAt: 0,
        formats: [],
      };
      albumMap.set(id, al);
    }
    al.tracks.push(t);
    al.duration += t.duration;
    al.addedAt = Math.max(al.addedAt, t.addedAt);
    al.lastPlayedAt = Math.max(al.lastPlayedAt, t.lastPlayedAt ?? 0);
    al.year ??= t.year;
    al.coverId ??= t.coverId;
    if (!al.formats.includes(t.format)) al.formats.push(t.format);
  }
  const albums = [...albumMap.values()];
  albums.forEach((a) => a.tracks.sort(compareAlbumOrder));
  albums.sort((a, b) => a.title.localeCompare(b.title, 'it'));

  const artistMap = new Map<string, Artist>();
  const artistFor = (name: string) => {
    const id = artistIdOf(name);
    let ar = artistMap.get(id);
    if (!ar) {
      ar = { id, name, albums: [], tracks: [] };
      artistMap.set(id, ar);
    }
    return ar;
  };
  for (const t of tracks) artistFor(t.artist).tracks.push(t);
  for (const al of albums) {
    const ar = artistFor(al.artist);
    ar.albums.push(al);
    ar.coverId ??= al.coverId;
  }
  const artists = [...artistMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  artists.forEach((a) => a.tracks.sort((x, y) => x.title.localeCompare(y.title, 'it')));

  return {
    tracks,
    albums,
    artists,
    albumById: albumMap,
    artistById: artistMap,
  };
}

export function useLibrary(): Library {
  const tracks = useLiveQuery(() => db.tracks.toArray(), []);
  return useMemo(() => ({ ...buildLibrary(tracks ?? []), loaded: tracks !== undefined }), [tracks]);
}

export function usePlaylists(): Playlist[] {
  return useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []) ?? [];
}

export function useFavoriteIds(): Set<string> {
  const favs = useLiveQuery(() => db.favorites.orderBy('addedAt').reverse().toArray(), []);
  return useMemo(() => new Set((favs ?? []).map((f) => f.trackId)), [favs]);
}

/** Favorite track ids, newest first. */
export function useFavoriteOrder(): string[] {
  const favs = useLiveQuery(() => db.favorites.orderBy('addedAt').reverse().toArray(), []);
  return useMemo(() => (favs ?? []).map((f) => f.trackId), [favs]);
}

export function totalDuration(tracks: Track[]): number {
  return tracks.reduce((n, t) => n + (t.duration || 0), 0);
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
