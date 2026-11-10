export function Chips<T extends string>({ items, value, onChange }: { items: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="tablist">
      {items.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'chip on' : 'chip'} onClick={() => onChange(id)}>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
