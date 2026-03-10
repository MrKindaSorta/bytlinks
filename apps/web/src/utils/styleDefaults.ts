import type { BaseStyle, ButtonStyle, FontPair, Animation, LayoutVariant, ContentDisplay, Theme, SectionsConfig } from '@bytlinks/shared';

/**
 * Each base style ships with recommended defaults for font, button, and animation.
 * When colorMode/fontPair/buttonStyle is 'style-default', the CSS theme file handles
 * colors and fonts directly. These defaults are used for resolution and for snapping
 * sub-settings when the user picks a new style.
 */

interface StyleDefaults {
  fontPair: FontPair;
  buttonStyle: ButtonStyle;
  animation: Animation;
  layoutVariant: LayoutVariant;
  contentDisplay: ContentDisplay;
}

export const STYLE_DEFAULTS: Record<BaseStyle, StyleDefaults> = {
  minimal:        { fontPair: 'geometric',  buttonStyle: 'filled',        animation: 'fade',      layoutVariant: 'centered',    contentDisplay: 'flow' },
  'bold-type':    { fontPair: 'editorial',  buttonStyle: 'filled',        animation: 'slide-up',  layoutVariant: 'centered',    contentDisplay: 'flow' },
  'dark-pro':     { fontPair: 'mono-serif', buttonStyle: 'filled',        animation: 'fade',      layoutVariant: 'left-photo',  contentDisplay: 'flow' },
  glass:          { fontPair: 'geometric',  buttonStyle: 'ghost',         animation: 'blur-in',   layoutVariant: 'centered',    contentDisplay: 'flow' },
  brutalist:      { fontPair: 'mono-serif', buttonStyle: 'brutalist',     animation: 'none',      layoutVariant: 'left-photo',  contentDisplay: 'flow' },
  editorial:      { fontPair: 'editorial',  buttonStyle: 'outline',       animation: 'fade',      layoutVariant: 'left-photo',  contentDisplay: 'flow' },
  'soft-warm':    { fontPair: 'humanist',   buttonStyle: 'soft',          animation: 'scale',     layoutVariant: 'centered',    contentDisplay: 'flow' },
  'neon-night':   { fontPair: 'condensed',  buttonStyle: 'outline',       animation: 'slide-up',  layoutVariant: 'centered',    contentDisplay: 'spotlight' },
  paper:          { fontPair: 'slab',       buttonStyle: 'filled',        animation: 'fade',      layoutVariant: 'centered',    contentDisplay: 'flow' },
  'gradient-flow':{ fontPair: 'geometric',  buttonStyle: 'pill',          animation: 'slide-up',  layoutVariant: 'centered',    contentDisplay: 'flow' },
  grid:           { fontPair: 'grotesque',  buttonStyle: 'outline-sharp', animation: 'cascade',   layoutVariant: 'right-photo', contentDisplay: 'flow' },
  retro:          { fontPair: 'retro',      buttonStyle: 'shadow',        animation: 'slide-up',  layoutVariant: 'centered',    contentDisplay: 'flow' },
};

/**
 * Default color tokens per base style — mirrors the CSS theme files.
 * Used when colorMode is 'style-default' so JS has access to the same
 * values that the CSS custom properties define on the DOM.
 */
export interface StyleColors {
  pageBg: string;
  pageText: string;
  accent: string;
  surfaceAlt: string;
  btnBg: string;
  btnText: string;
}

export const STYLE_COLORS: Record<BaseStyle, StyleColors> = {
  minimal:         { pageBg: '#ffffff', pageText: '#1c1917', accent: '#1c1917', surfaceAlt: '#fafaf9', btnBg: '#1c1917', btnText: '#ffffff' },
  'bold-type':     { pageBg: '#fafaf9', pageText: '#0c0a09', accent: '#0c0a09', surfaceAlt: '#f5f5f4', btnBg: '#0c0a09', btnText: '#fafaf9' },
  'dark-pro':      { pageBg: '#0a0a0b', pageText: '#e4e4e7', accent: '#22d3ee', surfaceAlt: '#1c1c1f', btnBg: '#22d3ee', btnText: '#0a0a0b' },
  glass:           { pageBg: '#0f172a', pageText: '#f1f5f9', accent: '#e2e8f0', surfaceAlt: '#1e293b', btnBg: '#e2e8f0', btnText: '#0f172a' },
  brutalist:       { pageBg: '#ffffff', pageText: '#000000', accent: '#000000', surfaceAlt: '#f5f5f5', btnBg: '#000000', btnText: '#ffffff' },
  editorial:       { pageBg: '#fefdfb', pageText: '#1a1a18', accent: '#1a1a18', surfaceAlt: '#f7f5f0', btnBg: '#1a1a18', btnText: '#fefdfb' },
  'soft-warm':     { pageBg: '#fef7f0', pageText: '#3d2c1e', accent: '#e07a3a', surfaceAlt: '#fdf2e9', btnBg: '#e07a3a', btnText: '#ffffff' },
  'neon-night':    { pageBg: '#0a0a12', pageText: '#e8e8f0', accent: '#00ff88', surfaceAlt: '#1a1a28', btnBg: '#00ff88', btnText: '#0a0a12' },
  paper:           { pageBg: '#f5f0e8', pageText: '#2c2418', accent: '#2c2418', surfaceAlt: '#ece6da', btnBg: '#2c2418', btnText: '#f5f0e8' },
  'gradient-flow': { pageBg: '#0f766e', pageText: '#ffffff', accent: '#ffffff', surfaceAlt: '#14857c', btnBg: '#ffffff', btnText: '#0f766e' },
  grid:            { pageBg: '#f8f8f8', pageText: '#1a1a1a', accent: '#1a1a1a', surfaceAlt: '#f0f0f0', btnBg: '#1a1a1a', btnText: '#f8f8f8' },
  retro:           { pageBg: '#f0e6d3', pageText: '#2a1f14', accent: '#c44d2a', surfaceAlt: '#e8dcc6', btnBg: '#c44d2a', btnText: '#f0e6d3' },
};

/** Legacy → new content display migration map. Transparently maps old DB values. */
const LEGACY_DISPLAY_MAP: Record<string, ContentDisplay> = {
  scroll: 'flow',
  'below-fold': 'spotlight',
  hamburger: 'flow',
  'tab-bar': 'flow',
};

/** Migrate a raw content display value (possibly legacy) to the new type. */
export function migrateContentDisplay(raw: string | undefined | null): ContentDisplay {
  if (!raw) return 'flow';
  if (raw in LEGACY_DISPLAY_MAP) return LEGACY_DISPLAY_MAP[raw];
  // Already a new value
  if (raw === 'flow' || raw === 'spotlight' || raw === 'sections' || raw === 'cards') return raw;
  return 'flow';
}

/** Resolve 'style-default' buttonStyle to the style's recommended value. */
export function resolveButtonStyle(theme: Theme): ButtonStyle {
  if (theme.buttonStyle === 'style-default') return STYLE_DEFAULTS[theme.base].buttonStyle;
  return theme.buttonStyle;
}

/** Resolve 'style-default' fontPair to the style's recommended value. */
export function resolveFontPair(theme: Theme): FontPair {
  if (theme.fontPair === 'style-default') return STYLE_DEFAULTS[theme.base].fontPair;
  return theme.fontPair;
}

/** Resolve layout variant — falls back to style default if missing. */
export function resolveLayoutVariant(theme: Theme): LayoutVariant {
  return theme.layoutVariant ?? STYLE_DEFAULTS[theme.base].layoutVariant;
}

/** Resolve content display — maps legacy values and falls back to style default. */
export function resolveContentDisplay(theme: Theme): ContentDisplay {
  const raw = theme.contentDisplay;
  if (!raw) return STYLE_DEFAULTS[theme.base].contentDisplay;
  return migrateContentDisplay(raw as string);
}

/** Resolve desktop layout — uses override if customized, otherwise falls back to mobile. */
export function resolveDesktopLayoutVariant(theme: Theme): LayoutVariant {
  return theme.desktopOverrides?.layoutVariant ?? resolveLayoutVariant(theme);
}

/** Resolve desktop content display — uses override if customized, otherwise falls back to mobile. */
export function resolveDesktopContentDisplay(theme: Theme): ContentDisplay {
  const raw = theme.desktopOverrides?.contentDisplay;
  if (raw) return migrateContentDisplay(raw as string);
  return resolveContentDisplay(theme);
}

/** Check if desktop has independent layout settings. */
export function hasDesktopOverrides(theme: Theme): boolean {
  const o = theme.desktopOverrides;
  return !!o && (o.layoutVariant != null || o.contentDisplay != null);
}

/** Resolve sections config — returns null if contentDisplay is not sections/cards. */
export function resolveSectionsConfig(theme: Theme): SectionsConfig | null {
  const display = resolveContentDisplay(theme);
  if (display !== 'sections' && display !== 'cards') return null;
  return theme.sectionsConfig ?? null;
}

/** Resolve 2-column desktop toggle. */
export function resolveTwoColumnDesktop(theme: Theme): boolean {
  return theme.twoColumnDesktop ?? false;
}
