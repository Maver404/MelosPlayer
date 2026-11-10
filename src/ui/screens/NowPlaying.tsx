import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getPlayer } from '../../audio/player';
import { toggleFavorite } from '../../library/actions';
import { albumIdOf, artistIdOf, useFavoriteIds } from '../../library/queries';
import { Cover } from '../components/Cover';
import { HeartButton } from '../components/HeartButton';
import { formatTime } from '../format';
import { useCoverUrl, usePlayer, useTint } from '../hooks';
import { Icon } from '../icons';
import { go } from '../router';
import { ui } from '../store';

export function NowPlaying() {
  const s = usePlayer();
  const t = s.current;
  const favIds = useFavoriteIds();
  const tint = useTint(t?.coverId, t?.album ?? '');
  const coverUrl = useCoverUrl(t?.coverId);
  const drag = useDragControls();
  const p = getPlayer();
  const [scrub, setScrub] = useState<number | null>(null);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (!t) ui.closeNowPlaying();
  }, [t]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.closeNowPlaying();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!t) return null;

  const position = scrub ?? s.position;
  const pct = s.duration ? (position / s.duration) * 100 : 0;
  const quality = [t.format, t.bitsPerSample ? `${t.bitsPerSample} bit` : '', t.sampleRate ? `${(t.sampleRate / 1000).toFixed(t.sampleRate % 1000 ? 1 : 0)} kHz` : '']
    .filter(Boolean)
    .join(' · ');

  const onSheetDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 140 || info.velocity.y > 700) ui.closeNowPlaying();
  };
  const onCoverDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -500) {
      setDir(1);
      void p.next();
    } else if (info.offset.x > 70 || info.velocity.x > 500) {
      setDir(-1);
      void p.prev();
    }
  };
  const openDevices = async () => {
    if (!(await p.showDevicePicker())) ui.toast('Scegli l’uscita audio dal Centro di Controllo');
  };
  const goTo = (path: string) => {
    ui.closeNowPlaying();
    go(path);
  };

  return (
    <motion.div
      className="np"
      role="dialog"
      aria-modal="true"
      aria-label="In riproduzione"
      style={{ ['--tint' as string]: tint.header, ['--deep' as string]: tint.deep, ['--glow' as string]: tint.glow }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 300 }}
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.85 }}
      onDragEnd={onSheetDragEnd}
    >
      <div className="np-ambient" aria-hidden="true">
        {coverUrl && <img src={coverUrl} alt="" className={s.playing ? 'np-ambient-img moving' : 'np-ambient-img'} />}
        <span className="np-blob np-blob-a" />
        <span className="np-blob np-blob-b" />
        <span className="np-shade" />
      </div>

      <div className="np-inner">
        <header className="np-head" onPointerDown={(e) => drag.start(e)}>
          <button className="icon-btn" aria-label="Chiudi" onClick={ui.closeNowPlaying}>
            <Icon name="down" size={28} strokeWidth={2} />
          </button>
          <button className="np-source" onClick={() => goTo(`album/${albumIdOf(t)}`)}>
            <span className="kicker">In riproduzione dall'album</span>
            <span className="np-source-title">{t.album}</span>
          </button>
          <button className="icon-btn" aria-label="Altre azioni" onClick={() => ui.openSheet({ kind: 'track', trackId: t.id })}>
            <Icon name="more" />
          </button>
        </header>

        <div className="np-art" onPointerDown={(e) => drag.start(e)}>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={t.id}
              className="np-cover-wrap"
              custom={dir}
              initial={{ opacity: 0, x: dir * 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: s.playing ? 1 : 0.86 }}
              exit={{ opacity: 0, x: -dir * 80, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              drag="x"
              dragSnapToOrigin
              dragElastic={0.5}
              onDragEnd={onCoverDragEnd}
            >
              <div className={s.playing ? 'np-cover breathe' : 'np-cover'}>
                <Cover coverId={t.coverId} seed={t.album} size="100%" radius={12} className="square" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="np-meta">
          <div className="np-titles">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1 key={t.id} className="display np-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {t.title}
              </motion.h1>
            </AnimatePresence>
            <button className="np-artist" onClick={() => goTo(`artist/${artistIdOf(t.artist)}`)}>
              {t.artist}
            </button>
          </div>
          <HeartButton on={favIds.has(t.id)} onToggle={() => void toggleFavorite(t.id)} size={28} />
        </div>

        <div className="np-seek">
          <input
            className="seek"
            type="range"
            aria-label="Posizione nel brano"
            min={0}
            max={s.duration || 0}
            step={0.25}
            value={position}
            onChange={(e) => setScrub(Number(e.target.value))}
            onPointerUp={() => {
              if (scrub !== null) p.seek(scrub);
              setScrub(null);
            }}
            onKeyUp={() => {
              if (scrub !== null) p.seek(scrub);
              setScrub(null);
            }}
            style={{ ['--pct' as string]: `${pct}%` }}
          />
          <div className="times">
            <span>{formatTime(position)}</span>
            <span className="quality">{quality}</span>
            <span>-{formatTime((s.duration || 0) - position)}</span>
          </div>
        </div>

        <div className="np-controls">
          <button className={s.shuffle ? 'icon-btn dot on' : 'icon-btn dot'} aria-label="Riproduzione casuale" aria-pressed={s.shuffle} onClick={() => p.toggleShuffle()}>
            <Icon name="shuffle" size={24} />
          </button>
          <button className="icon-btn big" aria-label="Brano precedente" onClick={() => { setDir(-1); void p.prev(); }}>
            <Icon name="prev" size={36} />
          </button>
          <button className="np-play" aria-label={s.playing ? 'Pausa' : 'Riproduci'} onClick={() => void p.toggle()}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={s.playing ? 'pause' : 'play'} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }} style={{ display: 'flex' }}>
                <Icon name={s.playing ? 'pause' : 'play'} size={34} />
              </motion.span>
            </AnimatePresence>
          </button>
          <button className="icon-btn big" aria-label="Brano successivo" onClick={() => { setDir(1); void p.next(); }}>
            <Icon name="next" size={36} />
          </button>
          <button
            className={s.repeat !== 'off' ? 'icon-btn dot on' : 'icon-btn dot'}
            aria-label={`Ripeti: ${s.repeat === 'off' ? 'disattivato' : s.repeat === 'all' ? 'tutto' : 'brano'}`}
            onClick={() => p.cycleRepeat()}
          >
            <Icon name="repeat" size={24} />
            {s.repeat === 'one' && <span className="repeat-one">1</span>}
          </button>
        </div>

        <div className="np-bottom">
          <button className={s.airplayActive ? 'device-btn on' : 'device-btn'} onClick={() => void openDevices()}>
            <Icon name="airplay" size={22} />
            <span>{s.airplayActive ? 'In riproduzione via AirPlay' : 'AirPlay e Bluetooth'}</span>
          </button>
          <button className="icon-btn" aria-label="Coda di riproduzione" onClick={() => ui.openSheet({ kind: 'queue' })}>
            <Icon name="queue" size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
