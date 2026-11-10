import { useMemo, useState } from 'react';
import { tintFrom } from '../../library/color';
import { useLibrary, useFavoriteIds, useFavoriteOrder, usePlaylists } from '../../library/queries';
import { Chips } from '../components/Chips';
import { Cover } from '../components/Cover';
import { Empty } from '../components/Empty';
import { Mosaic } from '../components/Mosaic';
import { TrackRow } from '../components/TrackRow';
import { greeting } from '../format';
import { usePlayer, useTint } from '../hooks';
import { Icon } from '../icons';
import { go } from '../router';
import { playIds } from '../play';

type Filter = 'tutto' | 'playlist' | 'album' | 'brani';

export function Home() {
  const lib = useLibrary();
  const playlists = usePlaylists();
  const favIds = useFavoriteIds();
  const favOrder = useFavoriteOrder();
  const player = usePlayer();
  const currentTint = useTint(player.current?.coverId, player.current?.album ?? 'melos');
  const tint = player.current ? currentTint : tintFrom('#3236B8');
  const [filter, setFilter] = useState<Filter>('tutto');

  const recentAlbums = useMemo(
    () => [...lib.albums].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt || b.addedAt - a.addedAt).slice(0, 12),
    [lib.albums],
  );
  const added = useMemo(() => [...lib.tracks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 8), [lib.tracks]);
  const quick = useMemo(() => {
    const items: { key: string; title: string; href: string; coverId?: string; album?: string; fav?: boolean; covers?: { coverId?: string; album: string }[] }[] = [];
    if (favOrder.length) items.push({ key: 'fav', title: 'Preferiti', href: 'playlist/favorites', fav: true });
    for (const pl of playlists.slice(0, 2)) {
      const covers = pl.trackIds.map((id) => lib.tracks.find((t) => t.id === id)).filter(Boolean).map((t) => ({ coverId: t!.coverId, album: t!.album }));
      items.push({ key: pl.id, title: pl.name, href: `playlist/${pl.id}`, covers });
    }
    for (const al of recentAlbums) {
      if (items.length >= 6) break;
      items.push({ key: al.id, title: al.title, href: `album/${al.id}`, coverId: al.coverId, album: al.title });
    }
    return items;
  }, [favOrder.length, playlists, recentAlbums, lib.tracks]);

  if (lib.loaded && lib.tracks.length === 0) {
    return (
      <div className="page page-home" style={{ ['--tint' as string]: tint.header }}>
        <header className="home-head">
          <h1 className="display">{greeting()}</h1>
          <button className="icon-btn" aria-label="Impostazioni" onClick={() => go('settings')}>
            <Icon name="settings" />
          </button>
        </header>
        <Empty
          icon="note"
          title="La tua musica, ovunque"
          text="Importa i brani da iCloud Drive, Google Drive o dall'app File: restano sul telefono e li ascolti anche senza connessione."
          action={
            <button className="btn btn-primary" onClick={() => go('import')}>
              <Icon name="plus" size={20} /> Importa musica
            </button>
          }
        />
      </div>
    );
  }

  const show = (f: Filter) => filter === 'tutto' || filter === f;

  return (
    <div className="page page-home" style={{ ['--tint' as string]: tint.header }}>
      <header className="home-head">
        <h1 className="display">{greeting()}</h1>
        <div className="row">
          <button className="icon-btn" aria-label="Importa musica" onClick={() => go('import')}>
            <Icon name="plus" />
          </button>
          <button className="icon-btn" aria-label="Impostazioni" onClick={() => go('settings')}>
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <Chips<Filter>
        items={[
          ['tutto', 'Tutto'],
          ['playlist', 'Playlist'],
          ['album', 'Album'],
          ['brani', 'Brani'],
        ]}
        value={filter}
        onChange={setFilter}
      />

      {show('playlist') && quick.length > 0 && (
        <div className="quick-grid">
          {quick.map((q, i) => (
            <a key={q.key} className="quick press rise" style={{ ['--i' as string]: i }} href={`#/${q.href}`} onClick={(e) => { e.preventDefault(); go(q.href); }}>
              {q.fav ? (
                <span className="fav-tile" aria-hidden="true">
                  <Icon name="heartFill" size={22} />
                </span>
              ) : q.covers ? (
                <Mosaic covers={q.covers} seed={q.title} size={56} radius={0} />
              ) : (
                <Cover coverId={q.coverId} seed={q.album ?? q.title} size={56} radius={0} />
              )}
              <span className="quick-title">{q.title}</span>
            </a>
          ))}
        </div>
      )}

      {show('album') && recentAlbums.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Ascoltati di recente</h2>
            <a href="#/library/album" onClick={(e) => { e.preventDefault(); go('library/album'); }}>Mostra tutto</a>
          </div>
          <div className="hscroll">
            {recentAlbums.map((al, i) => (
              <a key={al.id} className="album-card press rise" style={{ ['--i' as string]: i }} href={`#/album/${al.id}`} onClick={(e) => { e.preventDefault(); go(`album/${al.id}`); }}>
                <Cover coverId={al.coverId} seed={al.title} size={148} radius={8} shadow />
                <span className="card-title">{al.title}</span>
                <span className="card-sub">{al.artist}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {show('brani') && added.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Aggiunti di recente</h2>
              <p className="muted small">Disponibili offline</p>
            </div>
          </div>
          <ul className="list">
            {added.map((t, i) => (
              <TrackRow key={t.id} index={i} track={t} favorite={favIds.has(t.id)} onPlay={() => playIds(added.map((x) => x.id), i)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
