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
}

export function stripExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export async function readMetadata(file: File): Promise<ParsedMeta> {
  const fallback: ParsedMeta = {
    title: stripExtension(file.name),
    artist: 'Artista sconosciuto',
    album: 'Album sconosciuto',
    duration: 0,
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
      trackNo: c.track?.no ?? undefined,
      discNo: c.disk?.no ?? undefined,
      duration: mm.format.duration ?? 0,
      codec: mm.format.codec,
      lossless: mm.format.lossless,
      sampleRate: mm.format.sampleRate,
      bitsPerSample: mm.format.bitsPerSample,
      cover: pic ? new Blob([pic.data], { type: pic.format }) : undefined,
    };
  } catch {
    return fallback;
  }
}
