export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Index to play after `index`.
 * `auto` is true when the current track ended by itself (vs. the user pressing Next).
 * Returns null when playback should stop.
 */
export function nextIndex(length: number, index: number, repeat: RepeatMode, auto: boolean): number | null {
  if (length === 0) return null;
  if (auto && repeat === 'one') return index;
  if (index + 1 < length) return index + 1;
  return repeat === 'off' ? null : 0;
}

/** Previous restarts the current track when more than 3 s have played, like most players. */
export function prevIndex(length: number, index: number, positionSec: number): number | null {
  if (length === 0) return null;
  if (positionSec > 3) return index;
  return index > 0 ? index - 1 : 0;
}

/** Shuffled copy of `ids` with `firstId` (the track playing now) kept at the front. */
export function shuffled(ids: string[], firstId?: string, random: () => number = Math.random): string[] {
  const rest = ids.filter((id) => id !== firstId);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return firstId !== undefined && ids.includes(firstId) ? [firstId, ...rest] : rest;
}

export function nextRepeat(mode: RepeatMode): RepeatMode {
  return mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
}
