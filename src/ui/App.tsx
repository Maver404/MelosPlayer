import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getPlayer } from '../audio/player';
import { db } from '../db/schema';
import { clearLog, log } from '../diagnostics/log';
import { PROBES, probe } from '../library/formats';
import { importFiles, type ImportEvent } from '../library/importer';
import { deleteAudio, requestPersistence, storageEstimate } from '../library/storage';
import { Cover } from './Cover';
import { capabilities } from './env';
import { formatBytes, formatTime } from './format';
import { useLog, usePlayer } from './hooks';
import { Icon } from './icons';

const CHECKS = [
  ['lock', 'La musica continua a schermo bloccato'],
  ['advance', 'Passa da sola al brano successivo a schermo bloccato'],
  ['lockscreen', 'Titolo, copertina e controlli sulla schermata di blocco'],
  ['airplay', 'AirPlay verso TV / HomePod / casse'],
  ['bluetooth', 'Cuffie o cassa Bluetooth'],
  ['echo', 'Echo / Alexa associato via Bluetooth'],
  ['offline', 'Funziona in modalità aereo (dopo averla aperta una volta)'],
  ['reopen', 'Riaprendo l’app i brani sono ancora lì'],
] as const;

const CHECK_KEY = 'melos-checklist';

function loadChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function Yes({ ok, label }: { ok: boolean; label?: string }) {
  return <span className={ok ? 'pill pill-ok' : 'pill pill-no'}>{label ?? (ok ? 'Sì' : 'No')}</span>;
}

export function App() {
  const caps = useMemo(capabilities, []);
  const formats = useMemo(() => PROBES.map((p) => ({ ...p, result: probe(p.mime) })), []);
  const tracks = useLiveQuery(() => db.tracks.orderBy('addedAt').reverse().toArray(), []) ?? [];
  const player = usePlayer();
  const entries = useLog();

  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [events, setEvents] = useState<ImportEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const refreshStorage = () => {
    void storageEstimate().then(setEstimate);
    void navigator.storage?.persisted?.().then(setPersisted);
  };

  useEffect(() => {
    void requestPersistence().then((ok) => {
      setPersisted(ok);
      log('persistenza archivio', ok ? 'concessa' : 'non concessa');
    });
    refreshStorage();
  }, []);

  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '');
  }, []);

  const toggleCheck = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    localStorage.setItem(CHECK_KEY, JSON.stringify(next));
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    setBusy(true);
    setEvents([]);
    log('import avviato', `${files.length} file`);
    const n = await importFiles(files, (e) =>
      setEvents((prev) => {
        const copy = [...prev];
        copy[e.index] = e;
        return copy;
      }),
    );
    log('import finito', `${n} nuovi brani`);
    setBusy(false);
    refreshStorage();
    if (fileInput.current) fileInput.current.value = '';
    if (folderInput.current) folderInput.current.value = '';
  };

  const clearLibrary = async () => {
    if (!confirm('Eliminare tutti i brani importati da questa app? I file originali non vengono toccati.')) return;
    getPlayer().pause();
    for (const t of tracks) await deleteAudio(t);
    await db.transaction('rw', db.tracks, db.covers, db.blobs, async () => {
      await db.tracks.clear();
      await db.covers.clear();
      await db.blobs.clear();
    });
    refreshStorage();
  };

  const copyReport = async () => {
    const backends = tracks.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.storage]: (acc[t.storage] ?? 0) + 1 }), {});
    const lines = [
      'MELOS — report test di fattibilità',
      `Data: ${new Date().toLocaleString('it-IT')}`,
      `Browser: ${navigator.userAgent}`,
      `Installata come app: ${caps.standalone}`,
      `OPFS: ${caps.opfs} · archivio usato: ${JSON.stringify(backends)} · persistente: ${persisted}`,
      `Spazio: ${estimate ? `${formatBytes(estimate.usage)} usati di ${formatBytes(estimate.quota)}` : 'n/d'}`,
      `Media Session: ${caps.mediaSession} · AirPlay API: ${caps.airplay} · Remote Playback: ${caps.remotePlayback}`,
      '',
      'Formati (canPlayType):',
      ...formats.map((f) => `  ${f.label}: ${f.result || 'no'}`),
      '',
      'Brani importati:',
      ...tracks.map((t) => `  ${t.format} · ${t.title} — ${t.artist} · ${formatTime(t.duration)} · cover: ${t.coverId ? 'sì' : 'no'}`),
      '',
      'Checklist:',
      ...CHECKS.map(([id, label]) => `  [${checks[id] ? 'x' : ' '}] ${label}`),
      '',
      'Log (ultimi 60 eventi):',
      ...entries.slice(-60).map((e) => `  ${new Date(e.t).toLocaleTimeString('it-IT')} ${e.event}${e.detail ? ' ' + e.detail : ''}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(lines.join('\n'));
    }
  };

  const p = getPlayer();
  const current = player.current;

  return (
    <div className="app">
      <main className="content">
        <header className="hero">
          <p className="eyebrow">Fase 0 · test di fattibilità</p>
          <h1>Melos</h1>
          <p className="muted">
            Importa qualche brano, avvia la riproduzione e blocca lo schermo. Poi spunta la checklist e premi “Copia
            report”.
          </p>
          {!caps.standalone && caps.ios && (
            <div className="callout">
              Per il test vero aggiungi l’app alla Home: tasto Condividi → <strong>Aggiungi alla schermata Home</strong>,
              poi aprila dall’icona.
            </div>
          )}
        </header>

        <section className="card">
          <h2>Importa musica</h2>
          <div className="row-buttons">
            <button className="btn btn-primary" disabled={busy} onClick={() => fileInput.current?.click()}>
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
          {events.length > 0 && (
            <ul className="import-list">
              {events.map((e) =>
                e ? (
                  <li key={e.index} className={`stage-${e.stage}`}>
                    <span className="name">{e.fileName}</span>
                    <span className="stage">
                      {
                        {
                          meta: 'Lettura tag…',
                          copy: 'Copia…',
                          done: 'Pronto',
                          duplicate: 'Già presente',
                          skipped: 'Saltato',
                          error: 'Errore',
                        }[e.stage]
                      }
                      {e.message ? ` · ${e.message}` : ''}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Libreria</h2>
            <span className="muted small">{tracks.length} brani</span>
          </div>
          {tracks.length === 0 ? (
            <p className="muted">Nessun brano ancora. Importa un MP3, un FLAC, un WAV e un OGG per il test.</p>
          ) : (
            <>
              <ul className="tracks">
                {tracks.map((t, i) => (
                  <li key={t.id}>
                    <button
                      className={current?.id === t.id ? 'track active' : 'track'}
                      onClick={() => void p.playQueue(tracks.map((x) => x.id), i)}
                    >
                      <Cover coverId={t.coverId} seed={t.album} size={48} />
                      <span className="track-text">
                        <span className="track-title">{t.title}</span>
                        <span className="track-sub">
                          <span className="badge">{t.format}</span>
                          {t.artist} · {t.album}
                        </span>
                      </span>
                      <span className="track-dur">{formatTime(t.duration)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn btn-ghost danger" onClick={() => void clearLibrary()}>
                <Icon name="trash" size={18} /> Svuota libreria
              </button>
            </>
          )}
        </section>

        <section className="card">
          <h2>Checklist sul telefono</h2>
          <ul className="checks">
            {CHECKS.map(([id, label]) => (
              <li key={id}>
                <label>
                  <input type="checkbox" checked={!!checks[id]} onChange={() => toggleCheck(id)} />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
          <button className="btn btn-primary" onClick={() => void copyReport()}>
            <Icon name="copy" size={20} /> {copied ? 'Copiato!' : 'Copia report'}
          </button>
        </section>

        <section className="card">
          <h2>Questo dispositivo</h2>
          <dl className="facts">
            <dt>Installata come app</dt>
            <dd><Yes ok={caps.standalone} /></dd>
            <dt>Archivio privato (OPFS)</dt>
            <dd><Yes ok={caps.opfs} /></dd>
            <dt>Archivio persistente</dt>
            <dd><Yes ok={!!persisted} label={persisted === null ? '…' : undefined} /></dd>
            <dt>Spazio usato</dt>
            <dd>{estimate ? `${formatBytes(estimate.usage)} di ${formatBytes(estimate.quota)}` : 'n/d'}</dd>
            <dt>Controlli schermata di blocco</dt>
            <dd><Yes ok={caps.mediaSession} /></dd>
            <dt>AirPlay</dt>
            <dd><Yes ok={caps.airplay} label={caps.airplay ? (player.airplayAvailable ? 'Dispositivi trovati' : 'Sì') : 'No'} /></dd>
            <dt>Cast (Android)</dt>
            <dd><Yes ok={caps.remotePlayback} /></dd>
          </dl>
          <h3>Formati riproducibili</h3>
          <dl className="facts">
            {formats.map((f) => (
              <div key={f.label} className="fact-row">
                <dt>{f.label}</dt>
                <dd><Yes ok={f.result !== ''} label={f.result === 'probably' ? 'Sì' : f.result === 'maybe' ? 'Probabile' : 'No'} /></dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Registro eventi</h2>
            <button className="btn btn-ghost small" onClick={clearLog}>Pulisci</button>
          </div>
          <ol className="log">
            {[...entries].reverse().slice(0, 40).map((e, i) => (
              <li key={`${e.t}-${i}`}>
                <time>{new Date(e.t).toLocaleTimeString('it-IT')}</time>
                <span className="log-event">{e.event}</span>
                {e.detail && <span className="log-detail">{e.detail}</span>}
              </li>
            ))}
          </ol>
        </section>
      </main>

      {current && (
        <div className="player-bar" role="region" aria-label="Lettore">
          {player.error && <p className="player-error">{player.error}</p>}
          <div className="player-top">
            <Cover coverId={current.coverId} seed={current.album} size={48} />
            <div className="track-text">
              <span className="track-title">{current.title}</span>
              <span className="track-sub">
                {current.artist}
                {player.airplayActive && <span className="accent"> · AirPlay</span>}
              </span>
            </div>
            <button className="icon-btn" aria-label="Scegli dispositivo" onClick={() => void p.showDevicePicker()}>
              <Icon name="airplay" size={22} />
            </button>
          </div>
          <input
            className="seek"
            type="range"
            aria-label="Posizione nel brano"
            min={0}
            max={player.duration || 0}
            step={0.5}
            value={player.position}
            onChange={(e) => p.seek(Number(e.target.value))}
            style={{ ['--pct' as string]: `${player.duration ? (player.position / player.duration) * 100 : 0}%` }}
          />
          <div className="times">
            <span>{formatTime(player.position)}</span>
            <span>-{formatTime(player.duration - player.position)}</span>
          </div>
          <div className="controls">
            <button
              className={player.shuffle ? 'icon-btn on' : 'icon-btn'}
              aria-label="Riproduzione casuale"
              aria-pressed={player.shuffle}
              onClick={() => p.toggleShuffle()}
            >
              <Icon name="shuffle" size={22} />
            </button>
            <button className="icon-btn" aria-label="Brano precedente" onClick={() => void p.prev()}>
              <Icon name="prev" size={30} />
            </button>
            <button className="play-btn" aria-label={player.playing ? 'Pausa' : 'Riproduci'} onClick={() => void p.toggle()}>
              <Icon name={player.playing ? 'pause' : 'play'} size={28} />
            </button>
            <button className="icon-btn" aria-label="Brano successivo" onClick={() => void p.next()}>
              <Icon name="next" size={30} />
            </button>
            <button
              className={player.repeat !== 'off' ? 'icon-btn on' : 'icon-btn'}
              aria-label={`Ripeti: ${player.repeat === 'off' ? 'disattivato' : player.repeat === 'all' ? 'tutto' : 'brano'}`}
              onClick={() => p.cycleRepeat()}
            >
              <Icon name="repeat" size={22} />
              {player.repeat === 'one' && <span className="repeat-one">1</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
