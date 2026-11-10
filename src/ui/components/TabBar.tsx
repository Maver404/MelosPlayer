import { goTab, type Route } from '../router';
import { Icon, type IconName } from '../icons';

const TABS: { name: Route['name']; path: string; label: string; icon: IconName; active?: IconName }[] = [
  { name: 'home', path: '', label: 'Home', icon: 'home', active: 'homeFill' },
  { name: 'search', path: 'search', label: 'Cerca', icon: 'search' },
  { name: 'library', path: 'library', label: 'Libreria', icon: 'library' },
  { name: 'import', path: 'import', label: 'Importa', icon: 'import' },
];

/** Which tab a route belongs to: detail pages keep their tab lit. */
export function tabOf(route: Route): Route['name'] {
  if (route.name === 'album' || route.name === 'artist' || route.name === 'playlist') return 'library';
  if (route.name === 'settings' || route.name === 'diagnostics') return 'home';
  return route.name;
}

export function TabBar({ route }: { route: Route }) {
  const current = tabOf(route);
  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      {TABS.map((t) => {
        const on = current === t.name;
        return (
          <a
            key={t.name}
            href={`#/${t.path}`}
            className={on ? 'tab on' : 'tab'}
            aria-current={on ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (on) window.scrollTo({ top: 0, behavior: 'smooth' });
              else goTab(t.path);
            }}
          >
            <Icon name={on && t.active ? t.active : t.icon} size={24} strokeWidth={on ? 2.3 : 1.8} />
            <span>{t.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
