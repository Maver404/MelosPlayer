import { describe, expect, it } from 'vitest';
import { nextIndex, nextRepeat, prevIndex, shuffled } from './queue';

describe('nextIndex', () => {
  it('advances inside the queue', () => {
    expect(nextIndex(3, 0, 'off', true)).toBe(1);
  });
  it('stops at the end without repeat', () => {
    expect(nextIndex(3, 2, 'off', true)).toBeNull();
    expect(nextIndex(3, 2, 'off', false)).toBeNull();
  });
  it('wraps with repeat all', () => {
    expect(nextIndex(3, 2, 'all', true)).toBe(0);
  });
  it('repeat one replays only when the track ends by itself', () => {
    expect(nextIndex(3, 1, 'one', true)).toBe(1);
    expect(nextIndex(3, 1, 'one', false)).toBe(2);
  });
  it('handles an empty queue', () => {
    expect(nextIndex(0, 0, 'all', true)).toBeNull();
  });
});

describe('prevIndex', () => {
  it('restarts the track after 3 seconds', () => {
    expect(prevIndex(3, 2, 10)).toBe(2);
  });
  it('goes back near the start of a track', () => {
    expect(prevIndex(3, 2, 1)).toBe(1);
    expect(prevIndex(3, 0, 1)).toBe(0);
  });
});

describe('shuffled', () => {
  it('keeps every id and puts the current one first', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffled(ids, 'c');
    expect(out[0]).toBe('c');
    expect([...out].sort()).toEqual([...ids].sort());
  });
  it('is deterministic with a fixed random source', () => {
    const r = () => 0;
    expect(shuffled(['a', 'b', 'c'], undefined, r)).toEqual(['b', 'c', 'a']);
  });
});

describe('nextRepeat', () => {
  it('cycles off → all → one → off', () => {
    expect(nextRepeat('off')).toBe('all');
    expect(nextRepeat('all')).toBe('one');
    expect(nextRepeat('one')).toBe('off');
  });
});
