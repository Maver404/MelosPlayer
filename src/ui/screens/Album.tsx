import { useLibrary, useFavoriteIds } from '../../library/queries';
import { setFavorite } from '../../library/actions';
import { CollectionHeader } from '../components/CollectionHeader';
import { Cover } from '../components/Cover';
import { Empty } from '../components/Empty';
import { HeartButton } from '../components/HeartButton';
import { PlayButton } from '../components/PlayButton';
import { TopBar } from '../components/TopBar';
import { TrackRow } from '../components/TrackRow';
import { formatLongDuration, initials, plural } from '../format';
import { usePlayer, useTint } from '../hooks';
import { Icon } from '../icons';
import { go } from '../router';
import { isPlayingFrom, playIds, shuffleIds } from '../play';
import { getPlayer } from '../../audio/player';
import { artistIdOf } from '../../library/queries';
import { hueOf } from '../../library/color';
import { ui } from '../store';

export function AlbumScreen({ id }: { id: string }) {
  const lib = useLibrary();
  const favIds = useFavoriteIds();
  const player = usePlayer();
  const album = lib.albumById.get(id);
  const tint = useTint(album?.coverId, album?.title ?? id);

  if (!album) {
    return (
      <div className="page">
        <TopBar title="" />
        {lib.loaded && <Empty icon="disc" title="Album non trovato" text="Forse è stato eliminato dalla libreria." />}
      </div>
    );
  }
  const ids = album.tracks.map((t) => t.id);
  const active = isPlayingFrom(ids, player.queue, player.current?.id);
  const allFav = ids.every((t) => favIds.has(t));
  const size = album.tracks.reduce((n, t) => n + t.size, 0);
  const multiDisc = album.tracks.some((t) => (t.discNo ?? 1) > 1);

  return (
    <div className="page page-collection">
      <TopBar title={album.title} tint={tint.deep} />
      <CollectionHeader
        tint={tint}
        art={<Cover coverId={album.coverId} seed={album.title} size={236} radius={8} className="hero-cover" />}
        title={album.title}
        owner={
          <a className="owner press" href={`#/artist/${artistIdOf(album.artist)}`} onClick={(e) => { e.preventDefault(); go(`artist/${artistIdOf(album.artist)}`); }}>
            <span className="avatar tiny" style={{ background: `hsl(${hueOf(album.artist)} 55% 60%)` }}>{initials(album.artist)}</span>
            {album.artist}
          </a>
        }
        meta={
          <>
            <span>Album{album.year ? ` · ${album.year}` : ''}</span>
            {album.formats.map((f) => (
              <span key={f} className="badge outline">{f}</span>
            ))}
          </>
        }
      />
      <div className="action-row">
        <div className="row">
          <HeartButton on={allFav} onToggle={() => void setFavorite(ids, !allFav).then(() => ui.toast(allFav ? 'Rimosso dai preferiti' : 'Album aggiunto ai preferiti'))} />
          <span className="offline-dot" role="img" aria-label="Disponibile offline">
            <Icon name="arrowDown" size={16} strokeWidth={2.6} />
          </span>
          <button className="icon-btn" aria-label="Modifica album" onClick={() => ui.openSheet({ kind: 'edit', trackIds: ids, album: true })}>
            <Icon name="edit" size={22} />
          </button>
          <button className="icon-btn" aria-label="Aggiungi a playlist" onClick={() => ui.openSheet({ kind: 'playlistPicker', trackIds: ids })}>
            <Icon name="playlistAdd" size={22} />
          </button>
        </div>
        <div className="row">
          <button className={player.shuffle ? 'icon-btn on' : 'icon-btn'} aria-label="Riproduzione casuale" aria-pressed={player.shuffle} onClick={() => (active ? getPlayer().toggleShuffle() : shuffleIds(ids))}>
            <Icon name="shuffle" size={24} />
          </button>
          <PlayButton playing={active && player.playing} onClick={() => (active ? void getPlayer().toggle() : playIds(ids))} />
        </div>
      </div>
      <ol className="list">
        {album.tracks.map((t, i) => (
          <TrackRow key={t.id} index={i} track={t} number={multiDisc ? undefined : t.trackNo ?? i + 1} favorite={favIds.has(t.id)} onPlay={() => playIds(ids, i)} />
        ))}
      </ol>
      <div className="collection-foot">
        <span className="strong">
          {plural(album.tracks.length, 'brano', 'brani')} · {formatLongDuration(album.duration)}
        </span>
        <span>
          Aggiunto il {new Date(album.addedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · {(size / 1024 / 1024).toFixed(0)} MB sul dispositivo
        </span>
      </div>
    </div>
  );
}
