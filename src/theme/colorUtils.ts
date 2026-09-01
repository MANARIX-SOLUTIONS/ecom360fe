/** Parse #RRGGBB (case-insensitive) into 0–255 channels. */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(15, 52, 96, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => clampChannel(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Hover: lighten dark primaries, darken light ones (~8–18%). */
export function hoverFromPrimary(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#143d72";
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const factor = lum < 0.3 ? 1.18 : 0.88;
  return toHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

export function contrastAgainstWhite(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const L = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return 1.05 / (L + 0.05);
}

export const MIN_PRIMARY_CONTRAST_WHITE = 3;
