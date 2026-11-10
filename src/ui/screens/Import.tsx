import { useEffect, useRef, useState } from 'react';
import { log } from '../../diagnostics/log';
import { PROBES, probe } from '../../library/formats';
import { importFiles, type ImportEvent } from '../../library/importer';
import { storageEstimate } from '../../library/storage';
import { useLibrary } from '../../library/queries';
import { capabilities } from '../env';
import { formatBytes, plural } from '../format';
import { Icon, type IconName } from '../icons';
import { ui } from '../store';

const SOURCES: { title: string; sub: string; icon: IconName; color: string; bg: string }[] = [
  { title: 'iCloud Drive', sub: 'Dall’app File', icon: 'cloud', color: '#9CC7FF', bg: '#1F3B66' },
  { title: 'Google Drive', sub: 'Tramite l’app File, se installata', icon: 'drive', color: '#9FE3B8', bg: '#1E4D35' },
  { title: 'Sul mio iPhone', sub: 'Download, AirDrop, altre app', icon: 'folder', color: '#F5D27A', bg: '#4A3A16' },
];

const STAGE: Record<ImportEvent['stage'], string> = {
  meta: 'Lettura di tag e copertina…',
  copy: 'Copia nell’archivio dell’app…',
  done: 'Pronto offline',
  duplicate: 'Già nella libreria',
  skipped: 'Non è un file audio',
  error: 'Errore',
};

export function ImportScreen() {
  const caps = capabilities();
  const lib = useLibrary();
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<ImportEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    void storageEstimate().then(setEstimate);
    folderInput.current?.setAttribute('webkitdirectory', '');
  }, []);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    setBusy(true);
    setEvents([]);
    log('import avviato', `${files.length} file`);
    const n = await importFiles(
      files,
      (e) =>
        setEvents((prev) => {
          const copy = [...prev];
          copy[e.index] = e;
          return copy;
        }),
      (mime) => probe(mime) !== '',
    );
    log('import finito', `${n} nuovi brani`);
    setBusy(false);
    void storageEstimate().then(setEstimate);
    ui.toast(n ? `${plural(n, 'brano importato', 'brani importati')}` : 'Nessun brano nuovo');
    if (fileInput.current) fileInput.current.value = '';
    if (folderInput.current) folderInput.current.value = '';
  };

  const done = events.filter((e) => e && e.stage !== 'meta' && e.stage !== 'copy').length;
  const total = events.length;
  const supported = PROBES.filter((p) => probe(p.mime) !== '').map((p) => p.label);
  const musicBytes = lib.tracks.reduce((n, t) => n + t.size, 0);

  return (
    <div className="page">
      <h1 className="display page-title">Importa musica</h1>
      <p className="muted lead">I brani vengono copiati nell'app: restano ascoltabili offline anche se li togli dal cloud.</p>

      <div className="card list-card">
        {SOURCES.map((s) => (
          <button key={s.title} className="source press" disabled={busy} onClick={() => fileInput.current?.click()}>
            <span className="source-icon" style={{ background: s.bg, color: s.color }}>
              <Icon name={s.icon} size={22} />
            </span>
            <span className="track-text">
              <span className="track-title">{s.title}</span>
              <span className="track-sub">{s.sub}</span>
            </span>
            <Icon name="right" size={18} />
          </button>
        ))}
      </div>

      <div className="row-buttons">
        <button className="btn btn-primary grow" disabled={busy} onClick={() => fileInput.current?.click()}>
          <Icon name="plus" size={20} /> Scegli file
        </button>
        {caps.folderPicker && (
          <button className="btn" disabled={busy} onClick={() => folderInput.current?.click()}>
            <Icon name="folder" size={20} /> Cartella
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      <input ref={folderInput} type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      {caps.ios && <p className="muted small hint">Nel selettore tocca “Seleziona” in alto per sceglierne tanti insieme, anche un'intera cartella.</p>}

      {total > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>{busy ? 'Importazione in corso' : 'Importazione completata'}</h2>
            <span className="muted small tabular">
              {done} di {total}
            </span>
          </div>
          <div className="bar">
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <ul className="import-list">
            {events.map((e) =>
              e ? (
                <li key={e.index} className={`stage-${e.stage}`}>
                  <span className="import-state" aria-hidden="true">
                    {e.stage === 'done' ? <Icon name="check" size={16} strokeWidth={2.6} /> : e.stage === 'meta' || e.stage === 'copy' ? <span className="spinner" /> : <Icon name="close" size={14} strokeWidth={2.4} />}
                  </span>
                  <span className="track-text">
                    <span className="import-name">{e.fileName}</span>
                    <span className="import-stage">
                      {STAGE[e.stage]}
                      {e.message ? ` · ${e.message}` : ''}
                    </span>
                  </span>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Formati riproducibili qui</h2>
        <div className="format-chips">
          {supported.map((f) => (
            <span key={f} className="format-chip">{f}</span>
          ))}
        </div>
        <p className="muted small">Copertine, titoli, artisti e album vengono letti dai file. Se un file non ha i tag, uso il nome del file (“Artista - Titolo”).</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Spazio sul dispositivo</h2>
          <span className="muted small">{formatBytes(musicBytes)} di musica</span>
        </div>
        {estimate && estimate.quota > 0 && (
          <>
            <div className="bar thick">
              <span style={{ width: `${Math.max(1, (estimate.usage / estimate.quota) * 100)}%` }} />
            </div>
            <div className="legend">
              <span>
                <i className="dot accent-bg" /> Melos · {plural(lib.tracks.length, 'brano', 'brani')}
              </span>
              <span>
                <i className="dot" /> {formatBytes(Math.max(0, estimate.quota - estimate.usage))} disponibili
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
