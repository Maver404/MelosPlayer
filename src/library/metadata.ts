import { parseBlob, selectCover } from 'music-metadata';

export interface ParsedMeta {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  trackNo?: number;
  discNo?: number;
  duration: number;
  codec?: string;
  lossless?: boolean;
  sampleRate?: number;
  bitsPerSample?: number;
  cover?: Blob;
  /** Tag formats found in the file, e.g. ["ID3v2.3"]; empty when the file carries no tags. */
  tagTypes: string[];
  /** Parser error, when reading the file failed. */
  error?: string;
}

export const UNKNOWN_ARTIST = 'Artista sconosciuto';
export const UNKNOWN_ALBUM = 'Album sconosciuto';

export function stripExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

/**
 * Best guess from a file name such as "03 - Artista - Titolo.wav" or "Artista - Titolo.mp3",
 * used when the file has no tags.
 */
export function guessFromFileName(name: string): { title: string; artist?: string; trackNo?: number } {
  let base = stripExtension(name).replace(/_/g, ' ').trim();
  let trackNo: number | undefined;
  const num = base.match(/^(\d{1,3})\s*[-.)]?\s+(.*)$/);
  if (num) {
    trackNo = Number(num[1]);
    base = num[2];
  }
  const parts = base.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim(), trackNo };
  }
  return { title: base, trackNo };
}

export async function readMetadata(file: File): Promise<ParsedMeta> {
  const guess = guessFromFileName(file.name);
  const fallback: ParsedMeta = {
    title: guess.title,
    artist: guess.artist ?? UNKNOWN_ARTIST,
    album: UNKNOWN_ALBUM,
    trackNo: guess.trackNo,
    duration: 0,
    tagTypes: [],
  };
  try {
    const mm = await parseBlob(file, { duration: true });
    const c = mm.common;
    const pic = selectCover(c.picture);
    return {
      title: c.title?.trim() || fallback.title,
      artist: c.artist?.trim() || c.albumartist?.trim() || fallback.artist,
      album: c.album?.trim() || fallback.album,
      albumArtist: c.albumartist?.trim() || undefined,
      year: c.year,
      trackNo: c.track?.no ?? fallback.trackNo,
      discNo: c.disk?.no ?? undefined,
      duration: mm.format.duration ?? 0,
      codec: mm.format.codec,
      lossless: mm.format.lossless,
      sampleRate: mm.format.sampleRate,
      bitsPerSample: mm.format.bitsPerSample,
      cover: pic ? new Blob([pic.data as BlobPart], { type: pic.format }) : undefined,
      tagTypes: mm.format.tagTypes ?? [],
    };
  } catch (err) {
    return { ...fallback, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  }
}
