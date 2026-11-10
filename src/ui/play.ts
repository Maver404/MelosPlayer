import { getPlayer } from '../audio/player';

export function playIds(ids: string[], index = 0) {
  if (ids.length) void getPlayer().playQueue(ids, index);
}

export function shuffleIds(ids: string[]) {
  if (!ids.length) return;
  const p = getPlayer();
  if (!p.getState().shuffle) p.toggleShuffle();
  void p.playQueue(ids, Math.floor(Math.random() * ids.length));
}

/** True when the queue currently playing came from exactly this list. */
export function isPlayingFrom(ids: string[], queue: string[], currentId?: string): boolean {
  return !!currentId && ids.includes(currentId) && ids.every((id) => queue.includes(id));
}
