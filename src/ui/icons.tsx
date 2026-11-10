// Inline stroke icons (24×24), shared by the whole UI.
const paths = {
  play: 'M7.5 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  next: 'M5.5 5.2v13.6l9.9-6.8zM16.3 5h2.2v14h-2.2z',
  prev: 'M18.5 5.2v13.6L8.6 12zM5.5 5h2.2v14H5.5z',
  shuffle:
    'M3 7h3.5c2 0 3.3 1 4.4 2.6l2.2 3.3c1.1 1.6 2.4 3.1 4.4 3.1H21M18 13l3 3-3 3M3 16h3.5c1.4 0 2.4-.6 3.2-1.5M14.3 8.5c.8-.9 1.8-1.5 3.2-1.5H21M18 4l3 3-3 3',
  repeat: 'M17 2.5l3.5 3.5L17 9.5M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5M7 21.5L3.5 18 7 14.5M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5',
  airplay: 'M6 17H4.5A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5H18M12 15l5 6H7z',
  plus: 'M12 5v14M5 12h14',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

const filled = new Set(['play', 'pause', 'next', 'prev']);

export function Icon({ name, size = 24 }: { name: keyof typeof paths; size?: number }) {
  const fill = filled.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
