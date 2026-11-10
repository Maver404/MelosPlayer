import { hueOf } from '../../library/color';
import { useFavoriteIds, useLibrary } from '../../library/queries';
import { getPlayer } from '../../audio/player';
import { CollectionHeader } from '../components/CollectionHeader';
import { Cover } from '../components/Cover';
import { Empty } from '../components/Empty';
import { PlayButton } from '../components/PlayButton';
import { TopBar } from '../components/TopBar';
import { TrackRow } from '../components/TrackRow';
import { initials, plural } from '../format';
import { usePlayer, useTint } from '../hooks';
import { Icon } from '../icons';
import { go } from '../router';
import { isPlayingFrom, playIds, shuffleIds } from '../play';

export function ArtistScreen({ id }: { id: string }) {
  const lib = useLibrary();
  const favIds = useFavoriteIds();
  const player = usePlayer();
  const artist = lib.artistById.get(id);
  const tint = useTint(artist?.coverId, artist?.name ?? id);
  if (!artist) {
    return (
      <div className="page">
        <TopBar title="" />
        {lib.loaded && <Empty icon="user" title="Artista non trovato" text="Forse i suoi brani sono stati eliminati." />}
      </div>
    );
  }
  const ids = artist.tracks.map((t) => t.id);
  const active = isPlayingFrom(ids, player.queue, player.current?.id);
  return (
    <div className="page page-collection">
      <TopBar title={artist.name} tint={tint.deep} />
      <CollectionHeader
        tint={tint}
        art={<span className="avatar hero" style={{ background: `hsl(${hueOf(artist.name)} 55% 60%)` }}>{initials(artist.name)}</span>}
        kicker="Artista"
        title={artist.name}
        meta={<span>{plural(artist.albums.length, 'album', 'album')} · {plural(artist.tracks.length, 'brano', 'brani')}</span>}
      />
      <div className="action-row">
        <span />
        <div className="row">
          <button className={player.shuffle ? 'icon-btn on' : 'icon-btn'} aria-label="Riproduzione casuale" onClick={() => shuffleIds(ids)}>
            <Icon name="shuffle" size={24} />
          </button>
          <PlayButton playing={active && player.playing} onClick={() => (active ? void getPlayer().toggle() : playIds(ids))} />
        </div>
      </div>
      {artist.albums.length > 0 && (
        <section className="section">
          <h2 className="section-title">Album</h2>
          <div className="hscroll">
            {artist.albums.map((al) => (
              <a key={al.id} className="album-card press" href={`#/album/${al.id}`} onClick={(e) => { e.preventDefault(); go(`album/${al.id}`); }}>
                <Cover coverId={al.coverId} seed={al.title} size={140} radius={8} shadow />
                <span className="card-title">{al.title}</span>
                <span className="card-sub">{al.year ?? plural(al.tracks.length, 'brano', 'brani')}</span>
              </a>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <h2 className="section-title">Brani</h2>
        <ul className="list">
          {artist.tracks.map((t, i) => (
            <TrackRow key={t.id} index={i} track={t} favorite={favIds.has(t.id)} onPlay={() => playIds(ids, i)} />
          ))}
        </ul>
      </section>
    </div>
  );
}
