import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getPlayer } from '../../audio/player';
import { db, type Track } from '../../db/schema';
import { deletePlaylist, movePlaylistItem, removeFromPlaylist, renamePlaylist } from '../../library/actions';
import { tintFrom } from '../../library/color';
import { totalDuration, useFavoriteIds, useFavoriteOrder, useLibrary } from '../../library/queries';
import { CollectionHeader } from '../components/CollectionHeader';
import { Empty } from '../components/Empty';
import { Mosaic } from '../components/Mosaic';
import { PlayButton } from '../components/PlayButton';
import { TopBar } from '../components/TopBar';
import { TrackRow } from '../components/TrackRow';
import { formatLongDuration, plural } from '../format';
import { usePlayer, useTint } from '../hooks';
import { Icon } from '../icons';
import { back, goTab } from '../router';
import { isPlayingFrom, playIds, shuffleIds } from '../play';
import { ui } from '../store';

export function PlaylistScreen({ id }: { id: string }) {
  const isFav = id === 'favorites';
  const lib = useLibrary();
  const favIds = useFavoriteIds();
  const favOrder = useFavoriteOrder();
  const player = usePlayer();
  const playlist = useLiveQuery(() => (isFav ? undefined : db.playlists.get(id)), [id, isFav]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const trackIds = isFav ? favOrder : playlist?.trackIds ?? [];
  const byId = new Map(lib.tracks.map((t) => [t.id, t]));
  const entries = trackIds.map((tid, index) => ({ track: byId.get(tid), index })).filter((e): e is { track: Track; index: number } => !!e.track);
  const tracks = entries.map((e) => e.track);
  const first = tracks[0];
  const coverTint = useTint(first?.coverId, first?.album ?? id);
  const tint = isFav ? tintFrom('#FF5A36') : coverTint;
  const title = isFav ? 'Preferiti' : playlist?.name ?? '';

  if (!isFav && playlist === undefined && lib.loaded) {
    return (
      <div className="page">
        <TopBar title="" />
        <Empty icon="note" title="Playlist non trovata" text="Forse è stata eliminata." />
      </div>
    );
  }

  const ids = tracks.map((t) => t.id);
  const active = isPlayingFrom(ids, player.queue, player.current?.id);

  const startEdit = () => {
    setName(playlist?.name ?? '');
    setEditing(true);
  };
  const finishEdit = async () => {
    if (playlist && name.trim() && name !== playlist.name) await renamePlaylist(playlist.id, name);
    setEditing(false);
  };
  const remove = () =>
    ui.confirm({
      title: 'Eliminare la playlist?',
      message: `“${title}” verrà eliminata. I brani restano nella libreria.`,
      confirmLabel: 'Elimina playlist',
      danger: true,
      onConfirm: () => {
        void deletePlaylist(id).then(() => {
          ui.toast('Playlist eliminata');
          back();
        });
      },
    });

  return (
    <div className="page page-collection">
      <TopBar
        title={title}
        tint={tint.deep}
        right={
          !isFav &&
          (editing ? (
            <button className="text-btn accent" onClick={() => void finishEdit()}>
              Fine
            </button>
          ) : (
            <button className="icon-btn" aria-label="Modifica playlist" onClick={startEdit}>
              <Icon name="edit" size={22} />
            </button>
          ))
        }
      />
      <CollectionHeader
        tint={tint}
        art={
          isFav ? (
            <span className="fav-tile hero" aria-hidden="true">
              <Icon name="heartFill" size={84} />
            </span>
          ) : (
            <Mosaic covers={tracks.map((t) => ({ coverId: t.coverId, album: t.album }))} seed={title} size={236} radius={8} />
          )
        }
        kicker="Playlist"
        title={title}
        meta={<span>{plural(tracks.length, 'brano', 'brani')}{tracks.length ? ` · ${formatLongDuration(totalDuration(tracks))}` : ''}</span>}
      />

      {editing && (
        <div className="edit-panel">
          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void finishEdit()} />
          </label>
          <button className="btn btn-ghost danger" onClick={remove}>
            <Icon name="trash" size={18} /> Elimina playlist
          </button>
        </div>
      )}

      {!editing && tracks.length > 0 && (
        <div className="action-row">
          <div className="row">
            <span className="offline-dot" role="img" aria-label="Disponibile offline">
              <Icon name="arrowDown" size={16} strokeWidth={2.6} />
            </span>
          </div>
          <div className="row">
            <button className={player.shuffle ? 'icon-btn on' : 'icon-btn'} aria-label="Riproduzione casuale" onClick={() => (active ? getPlayer().toggleShuffle() : shuffleIds(ids))}>
              <Icon name="shuffle" size={24} />
            </button>
            <PlayButton playing={active && player.playing} onClick={() => (active ? void getPlayer().toggle() : playIds(ids))} />
          </div>
        </div>
      )}

      {tracks.length === 0 ? (
        <Empty
          icon={isFav ? 'heart' : 'playlistAdd'}
          title={isFav ? 'Nessun preferito' : 'Playlist vuota'}
          text={isFav ? 'Tocca il cuore su un brano per ritrovarlo qui.' : 'Aggiungi brani dal menu ⋯ di un brano o di un album.'}
          action={
            <button className="btn" onClick={() => goTab('library/brani')}>
              Sfoglia i brani
            </button>
          }
        />
      ) : (
        <ul className="list">
          {entries.map(({ track, index }, i) => (
            <TrackRow
              key={`${track.id}-${index}`}
              index={i}
              track={track}
              favorite={!isFav && favIds.has(track.id)}
              playlistId={isFav ? undefined : id}
              playlistIndex={index}
              onPlay={() => playIds(ids, i)}
            >
              {editing && (
                <span className="reorder">
                  <button className="icon-btn small" aria-label={`Sposta su ${track.title}`} disabled={i === 0} onClick={() => void movePlaylistItem(id, index, entries[i - 1].index)}>
                    <Icon name="arrowUp" size={18} />
                  </button>
                  <button className="icon-btn small" aria-label={`Sposta giù ${track.title}`} disabled={i === entries.length - 1} onClick={() => void movePlaylistItem(id, index, entries[i + 1].index)}>
                    <Icon name="arrowDown" size={18} />
                  </button>
                  <button className="icon-btn small danger" aria-label={`Togli ${track.title} dalla playlist`} onClick={() => void removeFromPlaylist(id, index)}>
                    <Icon name="close" size={18} />
                  </button>
                </span>
              )}
            </TrackRow>
          ))}
        </ul>
      )}
    </div>
  );
}
