import { db, type Track } from '../db/schema';
import { getPlayer } from '../audio/player';
import { extractColor } from './color';
import { deleteAudio } from './storage';

export async function toggleFavorite(trackId: string): Promise<boolean> {
  if (await db.favorites.get(trackId)) {
    await db.favorites.delete(trackId);
    return false;
  }
  await db.favorites.put({ trackId, addedAt: Date.now() });
  return true;
}

export async function setFavorite(trackIds: string[], on: boolean): Promise<void> {
  if (on) await db.favorites.bulkPut(trackIds.map((trackId, i) => ({ trackId, addedAt: Date.now() + i })));
  else await db.favorites.bulkDelete(trackIds);
}

export async function createPlaylist(name: string, trackIds: string[] = []): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.playlists.add({ id, name: name.trim() || 'Nuova playlist', trackIds, createdAt: now, updatedAt: now });
  return id;
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  await db.playlists.update(id, { name: name.trim() || 'Senza titolo', updatedAt: Date.now() });
}

export async function deletePlaylist(id: string): Promise<void> {
  await db.playlists.delete(id);
}

/** Adds tracks to a playlist, skipping the ones already in it. Returns how many were added. */
export async function addToPlaylist(id: string, trackIds: string[]): Promise<number> {
  const pl = await db.playlists.get(id);
  if (!pl) return 0;
  const fresh = trackIds.filter((t) => !pl.trackIds.includes(t));
  await db.playlists.update(id, { trackIds: [...pl.trackIds, ...fresh], updatedAt: Date.now() });
  return fresh.length;
}

export async function removeFromPlaylist(id: string, index: number): Promise<void> {
  const pl = await db.playlists.get(id);
  if (!pl) return;
  const trackIds = pl.trackIds.filter((_, i) => i !== index);
  await db.playlists.update(id, { trackIds, updatedAt: Date.now() });
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

export async function movePlaylistItem(id: string, from: number, to: number): Promise<void> {
  const pl = await db.playlists.get(id);
  if (!pl) return;
  await db.playlists.update(id, { trackIds: moveItem(pl.trackIds, from, to), updatedAt: Date.now() });
}

export type TrackPatch = Partial<Pick<Track, 'title' | 'artist' | 'album' | 'albumArtist' | 'year' | 'trackNo' | 'discNo'>>;

export async function updateTracks(ids: string[], patch: TrackPatch): Promise<void> {
  const clean: TrackPatch = {};
  for (const [k, v] of Object.entries(patch) as [keyof TrackPatch, TrackPatch[keyof TrackPatch]][]) {
    if (typeof v === 'string') (clean as Record<string, unknown>)[k] = v.trim() || undefined;
    else (clean as Record<string, unknown>)[k] = v;
  }
  if (clean.title === undefined) delete clean.title;
  if (clean.artist === undefined) delete clean.artist;
  if (clean.album === undefined) delete clean.album;
  await db.tracks.bulkUpdate(ids.map((key) => ({ key, changes: clean })));
}

export async function setCover(ids: string[], image: Blob): Promise<void> {
  const id = 'cover-user-' + crypto.randomUUID();
  await db.covers.put({ id, blob: image, color: await extractColor(image) });
  await db.tracks.bulkUpdate(ids.map((key) => ({ key, changes: { coverId: id } })));
}

export async function deleteTracks(ids: string[]): Promise<void> {
  const tracks = (await db.tracks.bulkGet(ids)).filter((t): t is Track => !!t);
  getPlayer().removeTracks(ids);
  for (const t of tracks) await deleteAudio(t);
  await db.transaction('rw', db.tracks, db.favorites, db.playlists, async () => {
    await db.tracks.bulkDelete(ids);
    await db.favorites.bulkDelete(ids);
    const set = new Set(ids);
    const pls = await db.playlists.toArray();
    for (const pl of pls) {
      if (pl.trackIds.some((t) => set.has(t))) {
        await db.playlists.update(pl.id, { trackIds: pl.trackIds.filter((t) => !set.has(t)) });
      }
    }
  });
  await removeUnusedCovers();
}

export async function removeUnusedCovers(): Promise<void> {
  const used = new Set((await db.tracks.toArray()).map((t) => t.coverId).filter(Boolean));
  const all = await db.covers.toCollection().primaryKeys();
  await db.covers.bulkDelete(all.filter((k) => !used.has(k)));
}

export async function recordPlay(id: string): Promise<void> {
  const t = await db.tracks.get(id);
  if (t) await db.tracks.update(id, { lastPlayedAt: Date.now(), playCount: (t.playCount ?? 0) + 1 });
}
