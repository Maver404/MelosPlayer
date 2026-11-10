export function EqBars({ playing }: { playing: boolean }) {
  return (
    <span className={playing ? 'eq' : 'eq eq-paused'} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
