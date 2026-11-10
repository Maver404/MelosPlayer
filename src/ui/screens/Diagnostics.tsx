import { useEffect, useMemo, useState } from 'react';
import { clearLog } from '../../diagnostics/log';
import { PROBES, probe } from '../../library/formats';
import { useLibrary } from '../../library/queries';
import { storageEstimate } from '../../library/storage';
import { TopBar } from '../components/TopBar';
import { capabilities } from '../env';
import { formatBytes, formatTime } from '../format';
import { useLog, usePlayer } from '../hooks';
import { Icon } from '../icons';

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

/** Feasibility test screen: device capabilities, a manual checklist and the event log. */
export function Diagnostics() {
  const caps = useMemo(capabilities, []);
  const formats = useMemo(() => PROBES.map((p) => ({ ...p, result: probe(p.mime) })), []);
  const { tracks } = useLibrary();
  const player = usePlayer();
  const entries = useLog();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void storageEstimate().then(setEstimate);
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const toggleCheck = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    localStorage.setItem(CHECK_KEY, JSON.stringify(next));
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

  return (
    <div className="page">
      <TopBar title="Test del dispositivo" threshold={40} />
      <h1 className="display page-title">Test del dispositivo</h1>
      <p className="muted lead">Verifica cosa supporta questo telefono. Spunta la checklist e premi “Copia report” per condividere il risultato.</p>

      <section className="card">
        <h2>Checklist</h2>
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
          <button className="text-btn" onClick={clearLog}>Pulisci</button>
        </div>
        <ol className="log">
          {[...entries].reverse().slice(0, 50).map((e, i) => (
            <li key={`${e.t}-${i}`}>
              <time>{new Date(e.t).toLocaleTimeString('it-IT')}</time>
              <span className="log-event">{e.event}</span>
              {e.detail && <span className="log-detail">{e.detail}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
