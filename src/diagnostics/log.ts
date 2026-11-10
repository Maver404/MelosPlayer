// Small persistent event log. It survives reloads, so after unlocking the phone
// you can see what happened while the screen was off.

export interface LogEntry {
  t: number;
  event: string;
  detail?: string;
}

const KEY = 'melos-diagnostics-log';
const MAX = 150;
let entries: LogEntry[] = [];
const listeners = new Set<() => void>();

try {
  entries = JSON.parse(localStorage.getItem(KEY) ?? '[]');
} catch {
  entries = [];
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable: keep the in-memory log only
  }
}

export function log(event: string, detail?: unknown) {
  const d = detail === undefined ? undefined : typeof detail === 'string' ? detail : JSON.stringify(detail);
  entries = [...entries.slice(-(MAX - 1)), { t: Date.now(), event, detail: d }];
  persist();
  listeners.forEach((l) => l());
}

export function clearLog() {
  entries = [];
  persist();
  listeners.forEach((l) => l());
}

export function getLog(): LogEntry[] {
  return entries;
}

export function subscribeLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
