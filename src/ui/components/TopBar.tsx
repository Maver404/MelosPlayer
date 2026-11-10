import type { ReactNode } from 'react';
import { useScrollY } from '../hooks';
import { Icon } from '../icons';
import { back } from '../router';

/** Back button bar that turns into a glass header with the title once the page scrolls. */
export function TopBar({ title, threshold = 220, right, tint }: { title: string; threshold?: number; right?: ReactNode; tint?: string }) {
  const y = useScrollY();
  const t = Math.max(0, Math.min(1, (y - threshold) / 60));
  return (
    <header className="topbar" style={{ ['--t' as string]: t, ['--tint' as string]: tint ?? 'rgba(20,20,24,1)' }}>
      <span className="topbar-bg" aria-hidden="true" />
      <button className="icon-btn" aria-label="Indietro" onClick={back}>
        <Icon name="back" size={26} strokeWidth={2} />
      </button>
      <span className="topbar-title" aria-hidden={t < 0.5}>
        {title}
      </span>
      <span className="topbar-right">{right}</span>
    </header>
  );
}
