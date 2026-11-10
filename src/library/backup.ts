import { db, type Track } from '../db/schema';

/**
 * Library backup without the audio: tags you edited, playlists, favorites and play counts.
 * Tracks are matched by their fingerprint, so after re-importing the same files
 * everything comes back as it was.
 */
export interface BackupV1 {
  app: 'melos';
  version: 1;
  exportedAt: string;
  tracks: (Pick<Track, 'hash' | 'title' | 'artist' | 'album' | 'albumArtist' | 'year' | 'trackNo' | 'discNo' | 'addedAt' | 'playCount' | 'lastPlayedAt'> & { fileName: string })[];
  playlists: { name: string; hashes: string[]; createdAt: number; updatedAt: number }[];
  favorites: { hash: string; addedAt: number }[];
}

export async function buildBackup(): Promise<BackupV1> {
  const [tracks, playlists, favorites] = await Promise.all([db.tracks.toArray(), db.playlists.toArray(), db.favorites.toArray()]);
  const hashOf = new Map(tracks.map((t) => [t.id, t.hash]));
  return {
    app: 'melos',
    version: 1,
    exportedAt: new Date().toISOString(),
    tracks: tracks.map((t) => ({
      hash: t.hash,
      fileName: t.fileName,
      title: t.title,
      artist: t.artist,
      album: t.album,
      albumArtist: t.albumArtist,
      year: t.year,
      trackNo: t.trackNo,
      discNo: t.discNo,
      addedAt: t.addedAt,
      playCount: t.playCount,
      lastPlayedAt: t.lastPlayedAt,
    })),
    playlists: playlists.map((p) => ({
      name: p.name,
      hashes: p.trackIds.map((id) => hashOf.get(id)).filter((h): h is string => !!h),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    favorites: favorites.map((f) => ({ hash: hashOf.get(f.trackId) ?? '', addedAt: f.addedAt })).filter((f) => f.hash),
  };
}

export interface RestoreResult {
  tracks: number;
  missing: number;
  playlists: number;
  favorites: number;
}

export function parseBackup(text: string): BackupV1 {
  const data = JSON.parse(text);
  if (data?.app !== 'melos' || data.version !== 1 || !Array.isArray(data.tracks)) {
    throw new Error('Questo file non è un backup di Melos');
  }
  return data as BackupV1;
}

export async function restoreBackup(backup: BackupV1): Promise<RestoreResult> {
  const tracks = await db.tracks.toArray();
  const idOf = new Map(tracks.map((t) => [t.hash, t.id]));
  let restored = 0;
  let missing = 0;
  await db.transaction('rw', db.tracks, db.playlists, db.favorites, async () => {
    for (const b of backup.tracks) {
      const id = idOf.get(b.hash);
      if (!id) {
        missing++;
        continue;
      }
      const { hash: _h, fileName: _f, ...changes } = b;
      void _h;
      void _f;
      await db.tracks.update(id, changes);
      restored++;
    }
    const existing = await db.playlists.toArray();
    for (const p of backup.playlists) {
      const trackIds = p.hashes.map((h) => idOf.get(h)).filter((x): x is string => !!x);
      const same = existing.find((e) => e.name === p.name);
      if (same) await db.playlists.update(same.id, { trackIds, updatedAt: Date.now() });
      else await db.playlists.add({ id: crypto.randomUUID(), name: p.name, trackIds, createdAt: p.createdAt, updatedAt: p.updatedAt });
    }
    const favs = backup.favorites.map((f) => ({ trackId: idOf.get(f.hash), addedAt: f.addedAt })).filter((f): f is { trackId: string; addedAt: number } => !!f.trackId);
    await db.favorites.bulkPut(favs);
  });
  return { tracks: restored, missing, playlists: backup.playlists.length, favorites: backup.favorites.length };
}

/** Opens the share sheet (iOS: "Salva su File") or falls back to a download. */
export async function shareOrDownload(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
