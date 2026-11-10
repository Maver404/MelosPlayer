import { db, type Track } from '../db/schema';
import { formatLabel, isAudioFile, mimeFor } from './formats';
import { readMetadata } from './metadata';
import { saveAudio } from './storage';

export type ImportStage = 'copy' | 'meta' | 'done' | 'duplicate' | 'skipped' | 'error';

export interface ImportEvent {
  index: number;
  total: number;
  fileName: string;
  stage: ImportStage;
  message?: string;
}

async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cheap fingerprint: size + first 2 MB. Enough to catch the same file imported twice. */
export async function fingerprint(file: Blob): Promise<string> {
  const head = await file.slice(0, 2 * 1024 * 1024).arrayBuffer();
  return `${file.size}-${await sha256Hex(head)}`;
}

async function coverIdFor(artist: string, album: string): Promise<string> {
  return 'cover-' + (await sha256Hex(new TextEncoder().encode(`${artist}\u0000${album}`))).slice(0, 24);
}

export async function importFiles(files: File[], onEvent: (e: ImportEvent) => void): Promise<number> {
  let imported = 0;
  const total = files.length;
  for (let index = 0; index < total; index++) {
    const file = files[index];
    const base = { index, total, fileName: file.name };
    if (!isAudioFile(file)) {
      onEvent({ ...base, stage: 'skipped', message: 'Non è un file audio' });
      continue;
    }
    try {
      onEvent({ ...base, stage: 'meta' });
      const hash = await fingerprint(file);
      if (await db.tracks.where('hash').equals(hash).count()) {
        onEvent({ ...base, stage: 'duplicate', message: 'Già nella libreria' });
        continue;
      }
      const meta = await readMetadata(file);

      onEvent({ ...base, stage: 'copy' });
      const id = crypto.randomUUID();
      const storage = await saveAudio(id, file);

      let coverId: string | undefined;
      if (meta.cover) {
        coverId = await coverIdFor(meta.albumArtist ?? meta.artist, meta.album);
        if (!(await db.covers.get(coverId))) await db.covers.put({ id: coverId, blob: meta.cover });
      }

      const track: Track = {
        id,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        albumArtist: meta.albumArtist,
        year: meta.year,
        trackNo: meta.trackNo,
        discNo: meta.discNo,
        duration: meta.duration,
        format: formatLabel(file, meta.codec),
        mime: mimeFor(file),
        lossless: meta.lossless,
        sampleRate: meta.sampleRate,
        bitsPerSample: meta.bitsPerSample,
        size: file.size,
        fileName: file.name,
        coverId,
        storage,
        hash,
        addedAt: Date.now(),
      };
      await db.tracks.add(track);
      imported++;
      onEvent({ ...base, stage: 'done' });
    } catch (err) {
      onEvent({ ...base, stage: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }
  return imported;
}
