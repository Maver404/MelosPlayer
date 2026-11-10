import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getPlayer, type PlayerState } from '../audio/player';
import { db } from '../db/schema';
import { getLog, subscribeLog, type LogEntry } from '../diagnostics/log';
import { extractColor, hueOf, tintFrom, tintFromHue, type Tint } from '../library/color';

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

/** UI tint for a cover: its dominant color, or a hue derived from `seed` when there is no artwork. */
export function useTint(coverId: string | undefined, seed: string): Tint {
  const cover = useLiveQuery(() => (coverId ? db.covers.get(coverId) : undefined), [coverId]);
  useEffect(() => {
    if (cover && !cover.color) {
      void extractColor(cover.blob).then((color) => {
        if (color) void db.covers.update(cover.id, { color });
      });
    }
  }, [cover]);
  return cover?.color ? tintFrom(cover.color) : tintFromHue(hueOf(seed));
}

export function useScrollY(): number {
  const [y, setY] = useState(() => window.scrollY);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}
