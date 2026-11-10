import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getPlayer, type PlayerState } from '../audio/player';
import { db } from '../db/schema';
import { getLog, subscribeLog, type LogEntry } from '../diagnostics/log';

export function usePlayer(): PlayerState {
  const p = getPlayer();
  return useSyncExternalStore(p.subscribe, p.getState);
}

export function useLog(): LogEntry[] {
  return useSyncExternalStore(subscribeLog, getLog);
}

/** Object URL for a stored cover, revoked when no longer needed. */
export function useCoverUrl(coverId?: string): string | undefined {
  const cover = useLiveQuery(() => (coverId ? db.covers.get(coverId) : undefined), [coverId]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!cover) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(cover.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [cover]);
  return url;
}
