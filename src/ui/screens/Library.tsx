import { useMemo, useState } from 'react';
import { hueOf } from '../../library/color';
import { useFavoriteIds, useFavoriteOrder, useLibrary, usePlaylists } from '../../library/queries';
import { Chips } from '../components/Chips';
import { Cover } from '../components/Cover';
import { Empty } from '../components/Empty';
import { Mosaic } from '../components/Mosaic';
import { TrackRow } from '../components/TrackRow';
import { initials, plural } from '../format';
import { Icon } from '../icons';
import { go, goTab, type LibraryTab } from '../router';
import { playIds } from '../play';
import { ui } from '../store';

type Sort = 'recenti' | 'az';

export function Library({ tab }: { tab: LibraryTab }) {
  const lib = useLibrary();
  const playlists = usePlaylists();
  const favOrder = useFavoriteOrder();
  const favIds = useFavoriteIds();
  const [sort, setSort] = useState<Sort>('recenti');

  const albums = useMemo(
    () => (sort === 'az' ? lib.albums : [...lib.albums].sort((a, b) => b.addedAt - a.addedAt)),
    [lib.albums, sort],
  );
  const tracks = useMemo(
    () =>
      sort === 'az'
        ? [...lib.tracks].sort((a, b) => a.title.localeCompare(b.title, 'it'))
        : [...lib.tracks].sort((a, b) => b.addedAt - a.addedAt),
    [lib.tracks, sort],
  );
  const coversOf = (ids: string[]) =>
    ids
      .map((id) => lib.tracks.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => ({ coverId: t!.coverId, album: t!.album }));

  const counts: Record<LibraryTab, string> = {
    playlist: plural(playlists.length + 1, 'playlist', 'playlist'),
    album: plural(lib.albums.length, 'album', 'album'),
    artisti: plural(lib.artists.length, 'artista', 'artisti'),
    brani: plural(lib.tracks.length, 'brano', 'brani'),
  };

  return (
    <div className="page">
      <header className="home-head">
        <h1 className="display">Libreria</h1>
        <div className="row">
          <button className="icon-btn" aria-label="Cerca" onClick={() => goTab('search')}>
            <Icon name="search" />
          </button>
          <button className="icon-btn" aria-label="Crea playlist" onClick={() => ui.openSheet({ kind: 'newPlaylist' })}>
            <Icon name="plus" />
          </button>
        </div>
      </header>
      <Chips<LibraryTab>
        items={[
          ['playlist', 'Playlist'],
          ['album', 'Album'],
          ['artisti', 'Artisti'],
          ['brani', 'Brani'],
        ]}
        value={tab}
        onChange={(t) => goTab(`library/${t}`)}
      />
      <div className="sort-row">
        {tab !== 'playlist' && tab !== 'artisti' ? (
          <button className="sort-btn" onClick={() => setSort(sort === 'recenti' ? 'az' : 'recenti')}>
            <Icon name="sort" size={16} strokeWidth={2} />
            {sort === 'recenti' ? 'Aggiunti di recente' : 'Dalla A alla Z'}
          </button>
        ) : (
          <span />
        )}
        <span className="muted small">{counts[tab]}</span>
      </div>

      {tab === 'playlist' && (
        <ul className="list">
          <li>
            <button className="row-link press" onClick={() => ui.openSheet({ kind: 'newPlaylist' })}>
              <span className="tile-icon">
                <Icon name="plus" size={26} />
              </span>
              <span className="track-title">Crea playlist</span>
            </button>
          </li>
          <li>
            <a className="row-link press" href="#/playlist/favorites" onClick={(e) => { e.preventDefault(); go('playlist/favorites'); }}>
              <span className="fav-tile big" aria-hidden="true">
                <Icon name="heartFill" size={24} />
              </span>
              <span className="track-text">
                <span className="track-title">Preferiti</span>
                <span className="track-sub">
                  <span className="pin"><Icon name="pin" size={12} /></span>Playlist · {plural(favOrder.length, 'brano', 'brani')}
                </span>
              </span>
            </a>
          </li>
          {playlists.map((pl, i) => (
            <li key={pl.id} className="rise" style={{ ['--i' as string]: i }}>
              <a className="row-link press" href={`#/playlist/${pl.id}`} onClick={(e) => { e.preventDefault(); go(`playlist/${pl.id}`); }}>
                <Mosaic covers={coversOf(pl.trackIds)} seed={pl.name} size={60} />
                <span className="track-text">
                  <span className="track-title">{pl.name}</span>
                  <span className="track-sub">Playlist · {plural(pl.trackIds.length, 'brano', 'brani')}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {tab === 'album' &&
        (albums.length ? (
          <div className="album-grid">
            {albums.map((al, i) => (
              <a key={al.id} className="album-card press rise" style={{ ['--i' as string]: i }} href={`#/album/${al.id}`} onClick={(e) => { e.preventDefault(); go(`album/${al.id}`); }}>
                <Cover coverId={al.coverId} seed={al.title} size="100%" radius={8} shadow className="square" />
                <span className="card-title">{al.title}</span>
                <span className="card-sub">
                  {al.artist}
                  {al.year ? ` · ${al.year}` : ''}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <NoMusic />
        ))}

      {tab === 'artisti' &&
        (lib.artists.length ? (
          <ul className="list">
            {lib.artists.map((ar, i) => (
              <li key={ar.id} className="rise" style={{ ['--i' as string]: i }}>
                <a className="row-link press" href={`#/artist/${ar.id}`} onClick={(e) => { e.preventDefault(); go(`artist/${ar.id}`); }}>
                  <span className="avatar small" style={{ background: `hsl(${hueOf(ar.name)} 55% 60%)` }}>{initials(ar.name)}</span>
                  <span className="track-text">
                    <span className="track-title">{ar.name}</span>
                    <span className="track-sub">
                      {plural(ar.albums.length, 'album', 'album')} · {plural(ar.tracks.length, 'brano', 'brani')}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <NoMusic />
        ))}

      {tab === 'brani' &&
        (tracks.length ? (
          <>
            <div className="row-actions">
              <button className="btn btn-primary small" onClick={() => playIds(tracks.map((t) => t.id))}>
                <Icon name="play" size={18} /> Riproduci tutto
              </button>
            </div>
            <ul className="list">
              {tracks.map((t, i) => (
                <TrackRow key={t.id} index={i} track={t} favorite={favIds.has(t.id)} onPlay={() => playIds(tracks.map((x) => x.id), i)} />
              ))}
            </ul>
          </>
        ) : (
          <NoMusic />
        ))}
    </div>
  );
}

function NoMusic() {
  return (
    <Empty
      icon="note"
      title="Ancora nessun brano"
      text="Importa la tua musica per vederla qui."
      action={
        <button className="btn btn-primary" onClick={() => goTab('import')}>
          <Icon name="plus" size={20} /> Importa musica
        </button>
      }
    />
  );
}
