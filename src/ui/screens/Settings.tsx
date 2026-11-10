import { useEffect, useRef, useState } from 'react';
import { db } from '../../db/schema';
import { deleteTracks } from '../../library/actions';
import { buildBackup, parseBackup, restoreBackup, shareOrDownload } from '../../library/backup';
import { useLibrary, usePlaylists } from '../../library/queries';
import { requestPersistence, storageEstimate } from '../../library/storage';
import { TopBar } from '../components/TopBar';
import { formatBytes, plural } from '../format';
import { Icon } from '../icons';
import { go } from '../router';
import { ui } from '../store';

export function Settings() {
  const lib = useLibrary();
  const playlists = usePlaylists();
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storageEstimate().then(setEstimate);
    void navigator.storage?.persisted?.().then(setPersisted);
  }, [lib.tracks.length]);

  const music = lib.tracks.reduce((n, t) => n + t.size, 0);

  const exportData = async () => {
    const backup = await buildBackup();
    const date = new Date().toISOString().slice(0, 10);
    await shareOrDownload(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `melos-backup-${date}.json`);
  };

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const r = await restoreBackup(parseBackup(await file.text()));
      ui.toast(
        `Ripristinati ${plural(r.tracks, 'brano', 'brani')}, ${plural(r.playlists, 'playlist', 'playlist')}` +
          (r.missing ? ` · ${r.missing} da reimportare` : ''),
      );
    } catch (err) {
      ui.toast(err instanceof Error ? err.message : 'Backup non valido');
    }
    if (restoreInput.current) restoreInput.current.value = '';
  };

  const wipe = () =>
    ui.confirm({
      title: 'Svuotare la libreria?',
      message: `Verranno eliminati da Melos ${plural(lib.tracks.length, 'brano', 'brani')} e ${plural(playlists.length, 'playlist', 'playlist')}. I file originali su iCloud o nell'app File non vengono toccati.`,
      confirmLabel: 'Elimina tutto',
      danger: true,
      onConfirm: () => {
        void (async () => {
          await deleteTracks(lib.tracks.map((t) => t.id));
          await db.playlists.clear();
          ui.toast('Libreria svuotata');
        })();
      },
    });

  return (
    <div className="page">
      <TopBar title="Impostazioni" threshold={40} />
      <h1 className="display page-title">Impostazioni</h1>

      <section className="card">
        <h2>Archivio</h2>
        <dl className="facts">
          <dt>Brani</dt>
          <dd>{lib.tracks.length}</dd>
          <dt>Album</dt>
          <dd>{lib.albums.length}</dd>
          <dt>Musica salvata</dt>
          <dd>{formatBytes(music)}</dd>
          <dt>Spazio disponibile</dt>
          <dd>{estimate ? formatBytes(Math.max(0, estimate.quota - estimate.usage)) : 'n/d'}</dd>
          <dt>Protezione dalla pulizia automatica</dt>
          <dd>
            {persisted ? (
              <span className="pill pill-ok">Attiva</span>
            ) : (
              <button className="text-btn accent" onClick={() => void requestPersistence().then(setPersisted)}>
                Richiedi
              </button>
            )}
          </dd>
        </dl>
        {!persisted && (
          <p className="muted small">
            iOS non garantisce che i dati delle web app restino per sempre se il telefono finisce lo spazio. Esporta un backup ogni tanto.
          </p>
        )}
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted small">
          Salva playlist, preferiti e le modifiche ai tag in un file (per esempio su iCloud Drive). I file audio non sono inclusi: dopo averli reimportati, il ripristino rimette tutto a posto.
        </p>
        <div className="row-buttons wrap">
          <button className="btn btn-primary grow" onClick={() => void exportData()}>
            <Icon name="export" size={20} /> Esporta backup
          </button>
          <button className="btn grow" onClick={() => restoreInput.current?.click()}>
            <Icon name="import" size={20} /> Ripristina
          </button>
        </div>
        <input ref={restoreInput} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e.target.files?.[0])} />
      </section>

      <section className="card list-card">
        <button className="source press" onClick={() => go('diagnostics')}>
          <span className="source-icon neutral">
            <Icon name="pulse" size={22} />
          </span>
          <span className="track-text">
            <span className="track-title">Test del dispositivo</span>
            <span className="track-sub">Formati, AirPlay, registro eventi</span>
          </span>
          <Icon name="right" size={18} />
        </button>
        <button className="source press danger" onClick={wipe} disabled={!lib.tracks.length}>
          <span className="source-icon danger-bg">
            <Icon name="trash" size={22} />
          </span>
          <span className="track-text">
            <span className="track-title">Svuota libreria</span>
            <span className="track-sub">Elimina brani e playlist da Melos</span>
          </span>
        </button>
      </section>

      <p className="muted small center">Melos {__APP_VERSION__}</p>
    </div>
  );
}
