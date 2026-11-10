const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  alac: 'audio/mp4',
  flac: 'audio/flac',
  wav: 'audio/wav',
  wave: 'audio/wav',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  caf: 'audio/x-caf',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg; codecs=opus',
  webm: 'audio/webm',
  weba: 'audio/webm',
};

export const AUDIO_EXTENSIONS = Object.keys(MIME_BY_EXT);

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extensionOf(file.name));
}

export function mimeFor(file: File): string {
  return MIME_BY_EXT[extensionOf(file.name)] ?? (file.type || 'application/octet-stream');
}

export function formatLabel(file: File, codec?: string): string {
  const ext = extensionOf(file.name);
  if (ext === 'm4a' && codec?.toUpperCase().includes('ALAC')) return 'ALAC';
  return (ext || codec || '?').toUpperCase();
}

/** Mime types probed on the diagnostics screen. */
export const PROBES: { label: string; mime: string }[] = [
  { label: 'MP3', mime: 'audio/mpeg' },
  { label: 'AAC / M4A', mime: 'audio/mp4; codecs="mp4a.40.2"' },
  { label: 'ALAC', mime: 'audio/mp4; codecs="alac"' },
  { label: 'FLAC', mime: 'audio/flac' },
  { label: 'WAV', mime: 'audio/wav' },
  { label: 'AIFF', mime: 'audio/aiff' },
  { label: 'OGG Vorbis', mime: 'audio/ogg; codecs="vorbis"' },
  { label: 'OGG Opus', mime: 'audio/ogg; codecs="opus"' },
  { label: 'WebM Opus', mime: 'audio/webm; codecs="opus"' },
];

export function probe(mime: string): '' | 'maybe' | 'probably' {
  if (typeof document === 'undefined') return '';
  return document.createElement('audio').canPlayType(mime) as '' | 'maybe' | 'probably';
}
