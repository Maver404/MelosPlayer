import type { ReactNode } from 'react';
import type { Tint } from '../../library/color';

/** Tinted hero used by album, artist and playlist pages. */
export function CollectionHeader({
  tint,
  art,
  kicker,
  title,
  meta,
  owner,
}: {
  tint: Tint;
  art: ReactNode;
  kicker?: string;
  title: string;
  meta: ReactNode;
  owner?: ReactNode;
}) {
  return (
    <div className="collection-head" style={{ ['--tint' as string]: tint.header, ['--glow' as string]: tint.glow }}>
      <div className="collection-art">{art}</div>
      <div className="collection-text">
        {kicker && <span className="kicker">{kicker}</span>}
        <h1 className="display collection-title">{title}</h1>
        {owner}
        <div className="collection-meta">{meta}</div>
      </div>
    </div>
  );
}
