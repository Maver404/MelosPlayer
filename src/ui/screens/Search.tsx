import { useMemo, useState } from 'react';
import { normalize, useFavoriteIds, useLibrary, usePlaylists } from '../../library/queries';
import { Cover } from '../components/Cover';
import { Mosaic } from '../components/Mosaic';
import { TrackRow } from '../components/TrackRow';
import { initials } from '../format';
import { Icon } from '../icons';
import { go } from '../router';
import { playIds } from '../play';
import { hueOf } from '../../library/color';

export function Search() {
  const lib = useLibrary();
  const playlists = usePlaylists();
  const favIds = useFavoriteIds();
  const [q, setQ] = useState('');
  const nq = normalize(q.trim());

  const results = useMemo(() => {
    if (!nq) return null;
    const has = (...xs: (string | undefined)[]) => xs.some((x) => x && normalize(x).includes(nq));
    return {
      tracks: lib.tracks.filter((t) => has(t.title, t.artist, t.album)).slice(0, 30),
      albums: lib.albums.filter((a) => has(a.title, a.artist)).slice(0, 12),
      artists: lib.artists.filter((a) => has(a.name)).slice(0, 12),
      playlists: playlists.filter((p) => has(p.name)),
    };
  }, [nq, lib, playlists]);

  const nothing = results && !results.tracks.length && !results.albums.length && !results.artists.length && !results.playlists.length;

  return (
    <div className="page">
      <h1 className="display page-title">Cerca</h1>
      <label className="search-field">
        <span className="sr-only">Cerca nella libreria</span>
        <Icon name="search" size={20} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brani, album, artisti, playlist" autoComplete="off" enterKeyHint="search" />
        {q && (
          <button className="icon-btn small" aria-label="Cancella" onClick={() => setQ('')}>
            <Icon name="close" size={18} />
          </button>
        )}
      </label>

      {!results && (
        <div className="browse-grid">
          {lib.albums.slice(0, 8).map((al, i) => (
            <a key={al.id} className="browse-tile press rise" style={{ ['--i' as string]: i, background: `hsl(${hueOf(al.title)} 45% 32%)` }} href={`#/album/${al.id}`} onClick={(e) => { e.preventDefault(); go(`album/${al.id}`); }}>
              <span>{al.title}</span>
              <Cover coverId={al.coverId} seed={al.title} size={72} radius={6} className="browse-cover" />
            </a>
          ))}
        </div>
      )}

      {nothing && (
        <div className="empty compact">
          <h2>Nessun risultato per “{q}”</h2>
          <p>Controlla l'ortografia o prova con un altro titolo o artista.</p>
        </div>
      )}

      {results && results.artists.length > 0 && (
        <section className="section">
          <h2 className="section-title">Artisti</h2>
          <div className="hscroll">
            {results.artists.map((ar) => (
              <a key={ar.id} className="artist-card press" href={`#/artist/${ar.id}`} onClick={(e) => { e.preventDefault(); go(`artist/${ar.id}`); }}>
                <span className="avatar" style={{ background: `hsl(${hueOf(ar.name)} 55% 60%)` }}>{initials(ar.name)}</span>
                <span className="card-title">{ar.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {results && results.albums.length > 0 && (
        <section className="section">
          <h2 className="section-title">Album</h2>
          <div className="hscroll">
            {results.albums.map((al) => (
              <a key={al.id} className="album-card press" href={`#/album/${al.id}`} onClick={(e) => { e.preventDefault(); go(`album/${al.id}`); }}>
                <Cover coverId={al.coverId} seed={al.title} size={132} radius={8} shadow />
                <span className="card-title">{al.title}</span>
                <span className="card-sub">{al.artist}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {results && results.playlists.length > 0 && (
        <section className="section">
          <h2 className="section-title">Playlist</h2>
          <ul className="list">
            {results.playlists.map((pl) => {
              const covers = pl.trackIds.map((id) => lib.tracks.find((t) => t.id === id)).filter(Boolean).map((t) => ({ coverId: t!.coverId, album: t!.album }));
              return (
                <li key={pl.id}>
                  <a className="row-link press" href={`#/playlist/${pl.id}`} onClick={(e) => { e.preventDefault(); go(`playlist/${pl.id}`); }}>
                    <Mosaic covers={covers} seed={pl.name} size={52} />
                    <span className="track-text">
                      <span className="track-title">{pl.name}</span>
                      <span className="track-sub">Playlist · {pl.trackIds.length} brani</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {results && results.tracks.length > 0 && (
        <section className="section">
          <h2 className="section-title">Brani</h2>
          <ul className="list">
            {results.tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} favorite={favIds.has(t.id)} onPlay={() => playIds(results.tracks.map((x) => x.id), i)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
