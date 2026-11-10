import { getPlayer } from '../../audio/player';
import { usePlayer, useTint } from '../hooks';
import { Icon } from '../icons';
import { ui } from '../store';
import { Cover } from './Cover';

export function MiniPlayer() {
  const s = usePlayer();
  const t = s.current;
  const tint = useTint(t?.coverId, t?.album ?? '');
  if (!t) return null;
  const p = getPlayer();
  const pct = s.duration ? (s.position / s.duration) * 100 : 0;
  return (
    <div className="mini" style={{ background: tint.mini }}>
      <button className="mini-open" onClick={ui.openNowPlaying} aria-label={`Apri In riproduzione: ${t.title} di ${t.artist}`}>
        <Cover coverId={t.coverId} seed={t.album} size={42} radius={6} />
        <span className="mini-text">
          <span className="mini-title">{t.title}</span>
          <span className="mini-sub">{s.airplayActive ? <span className="accent">AirPlay · </span> : null}{t.artist}</span>
        </span>
      </button>
      <button className="icon-btn" aria-label="Scegli dispositivo di riproduzione" onClick={() => void p.showDevicePicker()}>
        <Icon name="airplay" size={22} />
      </button>
      <button className="icon-btn" aria-label={s.playing ? 'Pausa' : 'Riproduci'} onClick={() => void p.toggle()}>
        <Icon name={s.playing ? 'pause' : 'play'} size={26} />
      </button>
      <span className="mini-progress" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
