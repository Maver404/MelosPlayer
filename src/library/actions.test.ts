import { describe, expect, it, vi } from 'vitest';

vi.mock('../audio/player', () => ({ getPlayer: () => ({ removeTracks: () => {} }) }));

const { moveItem } = await import('./actions');

describe('moveItem', () => {
  it('moves an item down and up', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
  it('ignores moves out of range', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 2)).toBe(list);
  });
});
