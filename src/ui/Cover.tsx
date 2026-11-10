import { useCoverUrl } from './hooks';
import { hueOf } from './format';

interface Props {
  coverId?: string;
  seed: string;
  size: number;
  radius?: number;
}

/** Album art, or an abstract placeholder derived from the album name when the file has none. */
export function Cover({ coverId, seed, size, radius = 6 }: Props) {
  const url = useCoverUrl(coverId);
  const h = hueOf(seed);
  const style = { width: size, height: size, borderRadius: radius };
  if (url) return <img className="cover" src={url} alt="" style={style} />;
  return (
    <span className="cover cover-placeholder" aria-hidden="true" style={{ ...style, background: `hsl(${h} 55% 32%)` }}>
      <span style={{ background: `hsl(${(h + 150) % 360} 85% 62%)` }} />
    </span>
  );
}
