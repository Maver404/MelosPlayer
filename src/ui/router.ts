import { useSyncExternalStore } from 'react';

export type LibraryTab = 'playlist' | 'album' | 'artisti' | 'brani';

export type Route =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'library'; tab: LibraryTab }
  | { name: 'album'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'playlist'; id: string }
  | { name: 'import' }
  | { name: 'settings' }
  | { name: 'diagnostics' };

const TABS: LibraryTab[] = ['playlist', 'album', 'artisti', 'brani'];

export function parseRoute(hash: string): Route {
  const [name, arg] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  switch (name) {
    case 'search':
      return { name: 'search' };
    case 'library':
      return { name: 'library', tab: TABS.includes(arg as LibraryTab) ? (arg as LibraryTab) : 'playlist' };
    case 'album':
      return arg ? { name: 'album', id: arg } : { name: 'home' };
    case 'artist':
      return arg ? { name: 'artist', id: arg } : { name: 'home' };
    case 'playlist':
      return arg ? { name: 'playlist', id: arg } : { name: 'home' };
    case 'import':
      return { name: 'import' };
    case 'settings':
      return { name: 'settings' };
    case 'diagnostics':
      return { name: 'diagnostics' };
    default:
      return { name: 'home' };
  }
}

let depth = 0;
const scrollByHash = new Map<string, number>();

function subscribe(fn: () => void) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => location.hash);
}

export function useRoute(): Route {
  return parseRoute(useHash());
}

/** Navigates forward, remembering the scroll position of the page we leave. */
export function go(path: string) {
  scrollByHash.set(location.hash, window.scrollY);
  depth++;
  location.hash = '#/' + path;
}

/** Switches tab without growing the back stack. */
export function goTab(path: string) {
  scrollByHash.set(location.hash, window.scrollY);
  depth = 0;
  history.replaceState(null, '', '#/' + path);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function back() {
  if (depth > 0) {
    depth--;
    history.back();
  } else {
    goTab('');
  }
}

export function savedScroll(hash: string): number {
  return scrollByHash.get(hash) ?? 0;
}
