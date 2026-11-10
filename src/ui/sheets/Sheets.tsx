import { AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { getPlayer } from '../../audio/player';
import { db, type Track } from '../../db/schema';
import {
  addToPlaylist,
  createPlaylist,
  deleteTracks,
  removeFromPlaylist,
  setCover,
  toggleFavorite,
  updateTracks,
  type TrackPatch,
} from '../../library/actions';
import { albumIdOf, artistIdOf, useFavoriteIds, useLibrary, usePlaylists } from '../../library/queries';
import { Cover } from '../components/Cover';
import { Mosaic } from '../components/Mosaic';
import { Sheet, SheetItem } from '../components/Sheet';
import { formatTime, plural } from '../format';
import { usePlayer } from '../hooks';
import { Icon } from '../icons';
import { go } from '../router';
import { ui, useUi, type Sheet as SheetState } from '../store';

export function Sheets() {
  const { sheet } = useUi();
  return <AnimatePresence>{sheet && <SheetSwitch key={sheet.kind} sheet={sheet} />}</AnimatePresence>;
}

function SheetSwitch({ sheet }: { sheet: SheetState }) {
  switch (sheet.kind) {
    case 'track':
      return <TrackSheet {...sheet} />;
    case 'playlistPicker':
      return <PlaylistPicker trackIds={sheet.trackIds} />;
    case 'newPlaylist':
      return <NewPlaylist trackIds={sheet.trackIds} />;
    case 'edit':
      return <EditSheet trackIds={sheet.trackIds} album={sheet.album} />;
    case 'queue':
      return <QueueSheet />;
    case 'confirm':
      return <ConfirmSheet {...sheet} />;
  }
}

function navigate(path: string) {
  ui.closeSheet();
  ui.closeNowPlaying();
  go(path);
}

function TrackSheet({ trackId, playlistId, playlistIndex }: Extract<SheetState, { kind: 'track' }>) {
  const track = useLiveQuery(() => db.tracks.get(trackId), [trackId]);
  const favs = useFavoriteIds();
  if (!track) return null;
  const fav = favs.has(track.id);
  const p = getPlayer();
  const done = (msg: string) => {
    ui.closeSheet();
    ui.toast(msg);
  };
  return (
    <Sheet
      onClose={ui.closeSheet}
      title={track.title}
      subtitle={`${track.artist} · ${track.album}`}
      action={<Cover coverId={track.coverId} seed={track.album} size={52} radius={6} />}
    >
      <SheetItem icon={<Icon name="playNext" />} label="Riproduci dopo" onClick={() => { p.playNext([track.id]); done('Verrà riprodotto dopo'); }} />
      <SheetItem icon={<Icon name="queue" />} label="Aggiungi alla coda" onClick={() => { p.addToQueue([track.id]); done('Aggiunto alla coda'); }} />
      <SheetItem icon={<Icon name="playlistAdd" />} label="Aggiungi a una playlist" onClick={() => ui.openSheet({ kind: 'playlistPicker', trackIds: [track.id] })} />
      <SheetItem
        icon={<Icon name={fav ? 'heartFill' : 'heart'} />}
        label={fav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        onClick={() => void toggleFavorite(track.id).then((on) => done(on ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti'))}
      />
      {playlistId && playlistIndex !== undefined && (
        <SheetItem icon={<Icon name="close" />} label="Togli da questa playlist" onClick={() => void removeFromPlaylist(playlistId, playlistIndex).then(() => done('Tolto dalla playlist'))} />
      )}
      <SheetItem icon={<Icon name="disc" />} label="Vai all'album" onClick={() => navigate(`album/${albumIdOf(track)}`)} />
      <SheetItem icon={<Icon name="user" />} label="Vai all'artista" onClick={() => navigate(`artist/${artistIdOf(track.artist)}`)} />
      <SheetItem icon={<Icon name="edit" />} label="Modifica informazioni" onClick={() => ui.openSheet({ kind: 'edit', trackIds: [track.id], album: false })} />
      <SheetItem
        icon={<Icon name="trash" />}
        danger
        label="Elimina dalla libreria"
        onClick={() =>
          ui.confirm({
            title: 'Eliminare il brano?',
            message: `“${track.title}” verrà tolto da Melos e dalle playlist. Il file originale non viene toccato.`,
            confirmLabel: 'Elimina',
            danger: true,
            onConfirm: () => void deleteTracks([track.id]).then(() => ui.toast('Brano eliminato')),
          })
        }
      />
      <p className="sheet-foot">
        {track.format}
        {track.bitsPerSample ? ` · ${track.bitsPerSample} bit` : ''}
        {track.sampleRate ? ` · ${(track.sampleRate / 1000).toFixed(1)} kHz` : ''} · {formatTime(track.duration)} · {(track.size / 1024 / 1024).toFixed(1)} MB
      </p>
    </Sheet>
  );
}

function PlaylistPicker({ trackIds }: { trackIds: string[] }) {
  const playlists = usePlaylists();
  const lib = useLibrary();
  const coversOf = (ids: string[]) =>
    ids
      .map((id) => lib.tracks.find((t) => t.id === id))
      .filter((t): t is Track => !!t)
      .map((t) => ({ coverId: t.coverId, album: t.album }));
  return (
    <Sheet onClose={ui.closeSheet} title="Aggiungi a una playlist" subtitle={plural(trackIds.length, 'brano', 'brani')} tall>
      <SheetItem icon={<Icon name="plus" />} label="Nuova playlist" onClick={() => ui.openSheet({ kind: 'newPlaylist', trackIds })} />
      {playlists.map((pl) => (
        <button
          key={pl.id}
          className="sheet-item"
          onClick={() =>
            void addToPlaylist(pl.id, trackIds).then((n) => {
              ui.closeSheet();
              ui.toast(n ? `Aggiunto a “${pl.name}”` : `Già presente in “${pl.name}”`);
            })
          }
        >
          <Mosaic covers={coversOf(pl.trackIds)} seed={pl.name} size={40} radius={5} />
          <span className="sheet-item-label">{pl.name}</span>
          <span className="sheet-item-detail">{pl.trackIds.length}</span>
        </button>
      ))}
    </Sheet>
  );
}

function NewPlaylist({ trackIds }: { trackIds?: string[] }) {
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);
  const create = async () => {
    const id = await createPlaylist(name || 'La mia playlist', trackIds ?? []);
    ui.closeSheet();
    ui.toast('Playlist creata');
    if (!trackIds?.length) navigate(`playlist/${id}`);
  };
  return (
    <Sheet onClose={ui.closeSheet} title="Nuova playlist">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <label className="field">
          <span>Nome</span>
          <input ref={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="La mia playlist" maxLength={80} />
        </label>
        <button className="btn btn-primary" type="submit">
          Crea{trackIds?.length ? ` e aggiungi ${plural(trackIds.length, 'brano', 'brani')}` : ''}
        </button>
      </form>
    </Sheet>
  );
}

function EditSheet({ trackIds, album }: { trackIds: string[]; album: boolean }) {
  const tracks = useLiveQuery(() => db.tracks.bulkGet(trackIds), [trackIds.join()]);
  const first = tracks?.[0];
  const [form, setForm] = useState<Record<string, string>>({});
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!first) return;
    setForm({
      title: first.title,
      artist: album ? first.albumArtist ?? first.artist : first.artist,
      album: first.album,
      albumArtist: first.albumArtist ?? '',
      year: first.year ? String(first.year) : '',
      trackNo: first.trackNo ? String(first.trackNo) : '',
    });
  }, [first, album]);
  useEffect(() => {
    if (!image) return;
    const u = URL.createObjectURL(image);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);
  if (!first) return null;

  const field = (key: string, label: string, opts: { inputMode?: 'numeric' } = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[key] ?? ''} inputMode={opts.inputMode} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </label>
  );

  const save = async () => {
    const num = (v?: string) => (v && /^\d+$/.test(v.trim()) ? Number(v) : undefined);
    const patch: TrackPatch = album
      ? { album: form.album, albumArtist: form.artist, year: num(form.year) }
      : { title: form.title, artist: form.artist, album: form.album, albumArtist: form.albumArtist || undefined, year: num(form.year), trackNo: num(form.trackNo) };
    await updateTracks(trackIds, patch);
    if (album && form.artist) {
      // keep per-track artists, but fill them in when they were unknown
      const unknown = (tracks ?? []).filter((t) => t && t.artist === 'Artista sconosciuto').map((t) => t!.id);
      if (unknown.length) await updateTracks(unknown, { artist: form.artist });
    }
    if (image) await setCover(trackIds, image);
    ui.closeSheet();
    ui.toast('Informazioni salvate');
    if (album) {
      const updated = await db.tracks.get(trackIds[0]);
      if (updated) {
        ui.closeNowPlaying();
        go(`album/${albumIdOf(updated)}`);
      }
    }
  };

  return (
    <Sheet
      onClose={ui.closeSheet}
      title={album ? 'Modifica album' : 'Modifica brano'}
      subtitle={album ? plural(trackIds.length, 'brano', 'brani') : first.fileName}
      tall
      action={
        <button className="text-btn accent" onClick={() => void save()}>
          Salva
        </button>
      }
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <button type="button" className="cover-edit press" onClick={() => imageInput.current?.click()}>
          {preview ? <img src={preview} alt="" className="cover" style={{ width: 96, height: 96, borderRadius: 8 }} /> : <Cover coverId={first.coverId} seed={first.album} size={96} radius={8} />}
          <span>
            <Icon name="image" size={18} /> Cambia copertina
          </span>
        </button>
        <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        {!album && field('title', 'Titolo')}
        {field('artist', album ? 'Artista dell’album' : 'Artista')}
        {field('album', 'Album')}
        {!album && field('albumArtist', 'Artista dell’album (se diverso)')}
        <div className="field-row">
          {field('year', 'Anno', { inputMode: 'numeric' })}
          {!album && field('trackNo', 'Traccia n.', { inputMode: 'numeric' })}
        </div>
        <button className="btn btn-primary" type="submit">
          Salva
        </button>
      </form>
    </Sheet>
  );
}

function QueueSheet() {
  const s = usePlayer();
  const lib = useLibrary();
  const byId = new Map(lib.tracks.map((t) => [t.id, t]));
  const p = getPlayer();
  const current = s.current;
  const upcoming = s.queue.map((id, i) => ({ id, i, t: byId.get(id) })).filter((x) => x.i > s.index && x.t);
  return (
    <Sheet onClose={ui.closeSheet} title="Coda" subtitle={upcoming.length ? `${plural(upcoming.length, 'brano', 'brani')} in arrivo` : 'Nessun brano in arrivo'} tall>
      {current && (
        <>
          <h3 className="sheet-label">In riproduzione</h3>
          <div className="queue-row current">
            <Cover coverId={current.coverId} seed={current.album} size={44} radius={5} />
            <span className="track-text">
              <span className="track-title accent">{current.title}</span>
              <span className="track-sub">{current.artist}</span>
            </span>
          </div>
        </>
      )}
      {upcoming.length > 0 && <h3 className="sheet-label">Prossimi brani</h3>}
      {upcoming.map(({ i, t }) => (
        <div key={`${t!.id}-${i}`} className="queue-row">
          <button className="queue-main" onClick={() => void p.jumpTo(i)}>
            <Cover coverId={t!.coverId} seed={t!.album} size={44} radius={5} />
            <span className="track-text">
              <span className="track-title">{t!.title}</span>
              <span className="track-sub">
                {t!.artist} · {formatTime(t!.duration)}
              </span>
            </span>
          </button>
          <button className="icon-btn small" aria-label={`Togli ${t!.title} dalla coda`} onClick={() => p.removeAt(i)}>
            <Icon name="close" size={18} />
          </button>
        </div>
      ))}
    </Sheet>
  );
}

function ConfirmSheet({ title, message, confirmLabel, danger, onConfirm }: Extract<SheetState, { kind: 'confirm' }>) {
  return (
    <Sheet onClose={ui.closeSheet} title={title}>
      <p className="sheet-message">{message}</p>
      <div className="form">
        <button
          className={danger ? 'btn btn-danger' : 'btn btn-primary'}
          onClick={() => {
            ui.closeSheet();
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn" onClick={ui.closeSheet}>
          Annulla
        </button>
      </div>
    </Sheet>
  );
}
