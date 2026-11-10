import { Cover } from './Cover';

/** Playlist artwork: one cover, or a 2×2 grid of the first four different album covers. */
export function Mosaic({ covers, seed, size, radius = 6 }: { covers: { coverId?: string; album: string }[]; seed: string; size: number; radius?: number }) {
  const unique: { coverId?: string; album: string }[] = [];
  for (const c of covers) {
    if (!unique.some((u) => u.album === c.album)) unique.push(c);
    if (unique.length === 4) break;
  }
  if (unique.length < 4) {
    const first = unique[0];
    return <Cover coverId={first?.coverId} seed={first?.album ?? seed} size={size} radius={radius} />;
  }
  return (
    <span className="mosaic" style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true">
      {unique.map((c) => (
        <Cover key={c.album} coverId={c.coverId} seed={c.album} size={size / 2} radius={0} />
      ))}
    </span>
  );
}
