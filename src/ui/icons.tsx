// Inline icons on a 24×24 grid. Stroke icons inherit currentColor.
const stroke = {
  home: 'M3.5 10.5L12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  library: 'M5 4v16M10 4v16M14.5 4.8l4.8 14.6',
  import: 'M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4 15.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3.5',
  heart: 'M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  back: 'M15 5l-7 7 7 7',
  down: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  queue: 'M3.5 6h13M3.5 12h13M3.5 18h8M16 15v6l5-3z',
  airplay: 'M6 17H4.5A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5H18M12 15l5 6H7z',
  shuffle:
    'M3 7h3.5c2 0 3.3 1 4.4 2.6l2.2 3.3c1.1 1.6 2.4 3.1 4.4 3.1H21M18 13l3 3-3 3M3 16h3.5c1.4 0 2.4-.6 3.2-1.5M14.3 8.5c.8-.9 1.8-1.5 3.2-1.5H21M18 4l3 3-3 3',
  repeat: 'M17 2.5l3.5 3.5L17 9.5M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5M7 21.5L3.5 18 7 14.5M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  playlistAdd: 'M3.5 6h12M3.5 11h12M3.5 16h7M18 13v7M14.5 16.5h7',
  playNext: 'M3.5 6h10M3.5 11h10M3.5 16h6M15 13l6 3.5-6 3.5z',
  disc: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-3.7 4-5.5 7.5-5.5s6.5 1.8 7.5 5.5',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  cloud: 'M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  drive: 'M9 3.5h6l6.5 11-3 5.5h-13l-3-5.5zM9 3.5l6.5 11M2.5 14.5h19',
  note: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  image: 'M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18M15.5 9.5h.01',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  export: 'M12 15V3.5M7.5 8L12 3.5 16.5 8M4 13v6a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6',
  pulse: 'M3 12h4l2.5-6 5 12 2.5-6h4',
  sort: 'M7 4v16M3.5 16.5L7 20l3.5-3.5M13 6h8M13 12h6M13 18h4',
  pin: 'M14 3l7 7-3 1-4 4 1 5-2 1-4-5-5 5-1-1 5-5-5-4 1-2 5 1 4-4z',
  copy: 'M9 9h10v11H9zM5 15V4h10',
} as const;

const fill = {
  play: 'M7.5 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  next: 'M5.5 5.2v13.6l9.9-6.8zM16.3 5h2.2v14h-2.2z',
  prev: 'M18.5 5.2v13.6L8.6 12zM5.5 5h2.2v14H5.5z',
  heartFill: stroke.heart,
  homeFill: stroke.home,
} as const;

export type IconName = keyof typeof stroke | keyof typeof fill;

export function Icon({ name, size = 24, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  if (name in fill) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={fill[name as keyof typeof fill]} />
      </svg>
    );
  }
  const dots = name === 'more';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={dots ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={stroke[name as keyof typeof stroke]} />
    </svg>
  );
}
