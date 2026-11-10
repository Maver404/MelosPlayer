import { hueOf } from '../../library/color';
import { useCoverUrl } from '../hooks';

interface Props {
  coverId?: string;
  seed: string;
  size?: number | string;
  radius?: number;
  className?: string;
  shadow?: boolean;
}

/** Album art, or an abstract composition derived from the album name when the file has none. */
export function Cover({ coverId, seed, size = 48, radius = 6, className = '', shadow = false }: Props) {
  const url = useCoverUrl(coverId);
  const style = { width: size, height: size, borderRadius: radius };
  const cls = `cover ${shadow ? 'cover-shadow' : ''} ${className}`;
  if (url) return <img className={cls} src={url} alt="" style={style} draggable={false} />;
  const h = hueOf(seed);
  const variant = h % 3;
  return (
    <span className={`${cls} cover-art cover-art-${variant}`} aria-hidden="true" style={{ ...style, background: `hsl(${h} 52% 30%)` }}>
      <span className="cover-a" style={{ background: `hsl(${(h + 150) % 360} 85% 62%)` }} />
      <span className="cover-b" style={{ background: `hsl(${h} 60% 11%)` }} />
    </span>
  );
}
