import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect } from 'react';
import { MiniPlayer } from './components/MiniPlayer';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { useHash, useRoute, savedScroll, type Route } from './router';
import { AlbumScreen } from './screens/Album';
import { ArtistScreen } from './screens/Artist';
import { Diagnostics } from './screens/Diagnostics';
import { Home } from './screens/Home';
import { ImportScreen } from './screens/Import';
import { Library } from './screens/Library';
import { NowPlaying } from './screens/NowPlaying';
import { PlaylistScreen } from './screens/Playlist';
import { Search } from './screens/Search';
import { Settings } from './screens/Settings';
import { Sheets } from './sheets/Sheets';
import { useUi } from './store';
import { usePlayer } from './hooks';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'search':
      return <Search />;
    case 'library':
      return <Library tab={route.tab} />;
    case 'album':
      return <AlbumScreen id={route.id} />;
    case 'artist':
      return <ArtistScreen id={route.id} />;
    case 'playlist':
      return <PlaylistScreen id={route.id} />;
    case 'import':
      return <ImportScreen />;
    case 'settings':
      return <Settings />;
    case 'diagnostics':
      return <Diagnostics />;
  }
}

export function App() {
  const hash = useHash();
  const route = useRoute();
  const { nowPlaying, sheet } = useUi();
  const player = usePlayer();

  useLayoutEffect(() => {
    window.scrollTo(0, savedScroll(hash));
  }, [hash]);

  useEffect(() => {
    document.body.classList.toggle('locked', nowPlaying || !!sheet);
  }, [nowPlaying, sheet]);

  return (
    <div className={player.current ? 'app has-mini' : 'app'}>
      <motion.main key={hash} className="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
        <Screen route={route} />
      </motion.main>
      <div className="dock">
        <MiniPlayer />
        <TabBar route={route} />
      </div>
      <AnimatePresence>{nowPlaying && <NowPlaying key="now-playing" />}</AnimatePresence>
      <Sheets />
      <Toast />
    </div>
  );
}
