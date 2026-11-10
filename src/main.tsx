import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { log } from './diagnostics/log';
import { isStandalone } from './ui/env';
import { App } from './ui/App';
import { getPlayer } from './audio/player';
import { db } from './db/schema';
import { importFiles } from './library/importer';
import './styles.css';

registerSW({ immediate: true });

log('avvio', { standalone: isStandalone(), online: navigator.onLine });
document.addEventListener('visibilitychange', () => log('visibilità', document.visibilityState));
window.addEventListener('online', () => log('rete', 'online'));
window.addEventListener('offline', () => log('rete', 'offline'));

// Test hooks for automated checks in development only.
if (import.meta.env.DEV) {
  Object.assign(window, { __op: { importFiles, getPlayer, db } });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
