export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/** Deterministic hue from a string, for items without artwork. */
export function hueOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Theme derived from one base color: deep tint for headers, darker for the mini player. */
export interface Tint {
  base: string;
  header: string;
  deep: string;
  mini: string;
  glow: string;
}

export function tintFrom(hex: string): Tint {
  const { h, s } = hexToHsl(hex);
  const sat = Math.min(Math.max(s, 35), 78);
  return {
    base: hex,
    header: `hsl(${h.toFixed(0)} ${sat.toFixed(0)}% 40%)`,
    deep: `hsl(${h.toFixed(0)} ${(sat * 0.9).toFixed(0)}% 16%)`,
    mini: `hsl(${h.toFixed(0)} ${(sat * 0.85).toFixed(0)}% 24%)`,
    glow: `hsl(${h.toFixed(0)} ${sat.toFixed(0)}% 30% / 0.65)`,
  };
}

export function tintFromHue(hue: number): Tint {
  const l = 0.42;
  const s = 0.55;
  // hsl → rgb so the tint goes through the same path as extracted colors
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return tintFrom(rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255));
}

/**
 * Dominant color of an image: average of its pixels, weighted towards
 * saturated mid-tones so a colorful cover is not washed out by black or white areas.
 */
export async function extractColor(blob: Blob): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(blob);
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(bmp, 0, 0, size, size);
    bmp.close?.();
    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (max + min) / 510;
      const w = 0.15 + sat * 2 * (1 - Math.abs(lum - 0.5) * 1.6);
      if (w <= 0) continue;
      r += pr * w;
      g += pg * w;
      b += pb * w;
      total += w;
    }
    if (!total) return undefined;
    return rgbToHex(r / total, g / total, b / total);
  } catch {
    return undefined;
  }
}
