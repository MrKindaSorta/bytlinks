/**
 * Derives a full color token set from 3 user inputs (primary, accent, text).
 * Uses HSL manipulation to generate secondary/tertiary tones.
 */

interface DerivedPalette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  btnBg: string;
  btnText: string;
  btnBorder: string;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function deriveFullPalette(
  primary: string,
  accent: string,
  text: string,
): DerivedPalette {
  const [pH, pS, pL] = hexToHsl(primary);
  const [aH, aS, aL] = hexToHsl(accent);
  const [tH, tS, tL] = hexToHsl(text);

  const isDarkBg = pL < 50;

  return {
    bg: primary,
    surface: hslToString(pH, clamp(pS - 5, 0, 100), isDarkBg ? clamp(pL + 5, 0, 100) : clamp(pL + 2, 0, 100)),
    surfaceAlt: hslToString(pH, clamp(pS - 3, 0, 100), isDarkBg ? clamp(pL + 8, 0, 100) : clamp(pL - 3, 0, 100)),
    border: hslToString(pH, clamp(pS - 10, 0, 100), isDarkBg ? clamp(pL + 15, 0, 100) : clamp(pL - 10, 0, 100)),
    text,
    textSecondary: hslToString(tH, clamp(tS - 15, 0, 100), isDarkBg ? clamp(tL - 20, 0, 100) : clamp(tL + 25, 0, 100)),
    textMuted: hslToString(tH, clamp(tS - 25, 0, 100), isDarkBg ? clamp(tL - 35, 0, 100) : clamp(tL + 45, 0, 100)),
    accent,
    accentHover: hslToString(aH, aS, clamp(aL - 8, 0, 100)),
    accentMuted: hslToString(aH, clamp(aS - 30, 0, 100), clamp(aL + 30, 0, 100)),
    btnBg: accent,
    btnText: aL > 50 ? hslToString(tH, tS, clamp(tL, 0, 20)) : '#ffffff',
    btnBorder: 'transparent',
  };
}

/** Maps preset names to [primary, accent, text] hex colors. */
export const COLOR_PRESETS: Record<string, [string, string, string]> = {
  ink: ['#ffffff', '#1c1917', '#1c1917'],
  midnight: ['#0f172a', '#38bdf8', '#e2e8f0'],
  sand: ['#faf5ef', '#c2956a', '#44403c'],
  forest: ['#1a2e1a', '#4ade80', '#d4e4d4'],
  'rose-gold': ['#fdf2f8', '#e879a0', '#4a2040'],
  arctic: ['#f0f9ff', '#0ea5e9', '#1e3a5f'],
  dusk: ['#1c1527', '#c084fc', '#e4dde8'],
  ember: ['#1a0f0a', '#f97316', '#e8d5c4'],
  ocean: ['#0c1929', '#06b6d4', '#c8dce8'],
  slate: ['#f8fafc', '#475569', '#334155'],
  clay: ['#f5ebe0', '#a67b5b', '#3d2b1f'],
  moss: ['#f0f4e8', '#6b8f3c', '#2d3b1e'],
  storm: ['#111827', '#6b7280', '#d1d5db'],
  coral: ['#fff5f5', '#f87171', '#3b1818'],
  charcoal: ['#18181b', '#a1a1aa', '#e4e4e7'],
};

export function applyDerivedPalette(palette: DerivedPalette, element: HTMLElement): void {
  element.style.setProperty('--page-bg', palette.bg);
  element.style.setProperty('--page-surface', palette.surface);
  element.style.setProperty('--page-surface-alt', palette.surfaceAlt);
  element.style.setProperty('--page-border', palette.border);
  element.style.setProperty('--page-text', palette.text);
  element.style.setProperty('--page-text-secondary', palette.textSecondary);
  element.style.setProperty('--page-text-muted', palette.textMuted);
  element.style.setProperty('--page-accent', palette.accent);
  element.style.setProperty('--page-accent-hover', palette.accentHover);
  element.style.setProperty('--page-btn-bg', palette.btnBg);
  element.style.setProperty('--page-btn-text', palette.btnText);
  element.style.setProperty('--page-btn-border', palette.btnBorder);
}
