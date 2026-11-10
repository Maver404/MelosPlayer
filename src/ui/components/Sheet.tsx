import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

interface Props {
  title?: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  action?: ReactNode;
  tall?: boolean;
}

/** Bottom sheet that slides up and can be dragged down to close. */
export function Sheet({ title, subtitle, onClose, children, action, tall }: Props) {
  const drag = useDragControls();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };
  return (
    <div className="sheet-layer">
      <motion.button
        className="sheet-backdrop"
        aria-label="Chiudi"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={tall ? 'sheet sheet-tall' : 'sheet'}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.9 }}
        onDragEnd={onDragEnd}
      >
        <div className="sheet-grab" onPointerDown={(e) => drag.start(e)}>
          <span className="sheet-handle" />
          {(title || action) && (
            <div className="sheet-head">
              <div className="sheet-titles">
                {title && <h2>{title}</h2>}
                {subtitle && <p>{subtitle}</p>}
              </div>
              {action}
            </div>
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </motion.div>
    </div>
  );
}

export function SheetItem({
  icon,
  label,
  onClick,
  danger,
  detail,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  detail?: string;
}) {
  return (
    <button className={danger ? 'sheet-item danger' : 'sheet-item'} onClick={onClick}>
      <span className="sheet-item-icon">{icon}</span>
      <span className="sheet-item-label">{label}</span>
      {detail && <span className="sheet-item-detail">{detail}</span>}
    </button>
  );
}
