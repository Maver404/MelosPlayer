import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../icons';

/** Big round accent play button; the icon morphs between play and pause. */
export function PlayButton({ playing, onClick, size = 56, label }: { playing: boolean; onClick: () => void; size?: number; label?: string }) {
  return (
    <button className="play-big" style={{ width: size, height: size }} aria-label={label ?? (playing ? 'Pausa' : 'Riproduci')} onClick={onClick}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={playing ? 'pause' : 'play'}
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0, rotate: 30 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          style={{ display: 'flex' }}
        >
          <Icon name={playing ? 'pause' : 'play'} size={size * 0.44} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
