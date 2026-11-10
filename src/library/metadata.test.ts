import { describe, expect, it } from 'vitest';
import { guessFromFileName } from './metadata';

describe('guessFromFileName', () => {
  it('reads artist and title', () => {
    expect(guessFromFileName('Luna Varese - Luce Fredda.wav')).toEqual({ artist: 'Luna Varese', title: 'Luce Fredda', trackNo: undefined });
  });
  it('reads a leading track number', () => {
    expect(guessFromFileName('03 - Luna Varese - Vetri.flac')).toEqual({ artist: 'Luna Varese', title: 'Vetri', trackNo: 3 });
    expect(guessFromFileName('07. Lunapark.mp3')).toEqual({ title: 'Lunapark', trackNo: 7 });
  });
  it('keeps a plain name as title', () => {
    expect(guessFromFileName('Torino sotto la pelle.wav')).toEqual({ title: 'Torino sotto la pelle', trackNo: undefined });
  });
  it('does not split hyphenated words', () => {
    expect(guessFromFileName('Anti-Hero.mp3').title).toBe('Anti-Hero');
  });
});
