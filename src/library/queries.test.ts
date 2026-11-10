import { describe, expect, it } from 'vitest';
import type { Track } from '../db/schema';
import { buildLibrary, normalize } from './queries';

const t = (p: Partial<Track>): Track => ({
  id: p.id ?? Math.random().toString(36),
  title: 'T',
  artist: 'A',
  album: 'Al',
  duration: 100,
  format: 'MP3',
  mime: 'audio/mpeg',
  size: 1,
  fileName: 'f.mp3',
  storage: 'opfs',
  hash: 'h',
  addedAt: 1,
  ...p,
});

describe('buildLibrary', () => {
  it('groups tracks into albums ordered by disc and track number', () => {
    const lib = buildLibrary([
      t({ id: '2', title: 'B', trackNo: 2 }),
      t({ id: '1', title: 'A', trackNo: 1 }),
      t({ id: '3', title: 'C', discNo: 2, trackNo: 1 }),
    ]);
    expect(lib.albums).toHaveLength(1);
    expect(lib.albums[0].tracks.map((x) => x.id)).toEqual(['1', '2', '3']);
    expect(lib.albums[0].duration).toBe(300);
  });
  it('uses the album artist so compilations stay one album', () => {
    const lib = buildLibrary([
      t({ artist: 'X', albumArtist: 'Vari', album: 'Hits' }),
      t({ artist: 'Y', albumArtist: 'Vari', album: 'Hits' }),
    ]);
    expect(lib.albums).toHaveLength(1);
    expect(lib.artists.map((a) => a.name).sort()).toEqual(['Vari', 'X', 'Y']);
  });
  it('is case-insensitive on album names', () => {
    const lib = buildLibrary([t({ album: 'Notturno' }), t({ album: 'notturno' })]);
    expect(lib.albums).toHaveLength(1);
  });
});

describe('normalize', () => {
  it('strips accents and case', () => {
    expect(normalize('Città Sommersa')).toBe('citta sommersa');
  });
});
