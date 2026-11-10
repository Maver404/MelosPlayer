import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '../icons';

const SPARKS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

/** Heart toggle with a small burst of sparks when it turns on. */
export function HeartButton({ on, onToggle, size = 26 }: { on: boolean; onToggle: () => void; size?: number }) {
  const [burst, setBurst] = useState(0);
  return (
    <button
      className={on ? 'icon-btn heart on' : 'icon-btn heart'}
      aria-label={on ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
      aria-pressed={on}
      onClick={() => {
        if (!on) setBurst((b) => b + 1);
        onToggle();
      }}
    >
      <motion.span key={on ? 'on' : 'off'} initial={{ scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }} style={{ display: 'flex' }}>
        <Icon name={on ? 'heartFill' : 'heart'} size={size} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && (
          <motion.span key={burst} className="sparks" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} onAnimationComplete={() => setBurst(0)}>
            {SPARKS.map((a, i) => (
              <motion.span
                key={i}
                className="spark"
                initial={{ x: 0, y: 0, scale: 1 }}
                animate={{ x: Math.cos(a) * 22, y: Math.sin(a) * 22, scale: 0.2 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
