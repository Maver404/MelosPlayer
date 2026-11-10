import { useSyncExternalStore } from 'react';

export type Sheet =
  | { kind: 'track'; trackId: string; playlistId?: string; playlistIndex?: number; queueIndex?: number }
  | { kind: 'playlistPicker'; trackIds: string[] }
  | { kind: 'edit'; trackIds: string[]; album: boolean }
  | { kind: 'queue' }
  | { kind: 'newPlaylist'; trackIds?: string[] }
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void };

interface UiState {
  nowPlaying: boolean;
  sheet: Sheet | null;
  toast: { id: number; text: string } | null;
}

let state: UiState = { nowPlaying: false, sheet: null, toast: null };
const listeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function set(patch: Partial<UiState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useUi(): UiState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

export const ui = {
  openNowPlaying: () => set({ nowPlaying: true }),
  closeNowPlaying: () => set({ nowPlaying: false }),
  openSheet: (sheet: Sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  toast(text: string) {
    clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text } });
    toastTimer = setTimeout(() => set({ toast: null }), 2400);
  },
  confirm(opts: Omit<Extract<Sheet, { kind: 'confirm' }>, 'kind'>) {
    set({ sheet: { kind: 'confirm', ...opts } });
  },
};
