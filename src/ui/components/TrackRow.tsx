import type { Track } from '../../db/schema';
import { formatTime } from '../format';
import { usePlayer } from '../hooks';
import { Icon } from '../icons';
import { ui } from '../store';
import { Cover } from './Cover';
import { EqBars } from './EqBars';

interface Props {
  track: Track;
  onPlay: () => void;
  /** Show the track number instead of the cover (album view). */
  number?: number;
  playlistId?: string;
  playlistIndex?: number;
  favorite?: boolean;
  index?: number;
  children?: React.ReactNode;
}

export function TrackRow({ track, onPlay, number, playlistId, playlistIndex, favorite, index = 0, children }: Props) {
  const player = usePlayer();
  const current = player.current?.id === track.id;
  return (
    <li className="track-row" style={{ ['--i' as string]: Math.min(index, 14) }}>
      <button className={current ? 'track-main current' : 'track-main'} onClick={onPlay} aria-label={`Riproduci ${track.title} di ${track.artist}`}>
        {number !== undefined ? (
          <span className="track-num">{current ? <EqBars playing={player.playing} /> : number}</span>
        ) : (
          <span className="track-cover">
            <Cover coverId={track.coverId} seed={track.album} size={48} radius={5} />
            {current && (
              <span className="track-cover-eq">
                <EqBars playing={player.playing} />
              </span>
            )}
          </span>
        )}
        <span className="track-text">
          <span className="track-title">{track.title}</span>
          <span className="track-sub">
            {favorite && (
              <span className="track-fav" aria-label="Preferito">
                <Icon name="heartFill" size={12} />
              </span>
            )}
            <span className="badge">{track.format}</span>
            <span className="ellipsis">{track.artist}</span>
          </span>
        </span>
        <span className="track-dur">{formatTime(track.duration)}</span>
      </button>
      {children}
      <button
        className="icon-btn track-more"
        aria-label={`Altre azioni per ${track.title}`}
        onClick={() => ui.openSheet({ kind: 'track', trackId: track.id, playlistId, playlistIndex })}
      >
        <Icon name="more" size={20} />
      </button>
    </li>
  );
}
