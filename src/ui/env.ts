import { opfsAvailable } from '../library/storage';

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function capabilities() {
  return {
    standalone: isStandalone(),
    ios: isIOS(),
    opfs: opfsAvailable(),
    mediaSession: 'mediaSession' in navigator,
    airplay: 'WebKitPlaybackTargetAvailabilityEvent' in window,
    remotePlayback: 'remote' in HTMLMediaElement.prototype,
    folderPicker: !isIOS() && 'webkitdirectory' in document.createElement('input'),
  };
}
