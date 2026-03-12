import type { Theme, FontPair, AnimationSpeed } from '@bytlinks/shared';
import { resolveFontPair } from './styleDefaults';
import { loadThemeFonts } from './loadThemeFonts';

const FONT_MAP: Record<FontPair, { display: string; body: string }> = {
  'mono-serif': { display: "'JetBrains Mono', monospace", body: "'Lora', serif" },
  editorial: { display: "'Playfair Display', serif", body: "'Source Sans 3', sans-serif" },
  grotesque: { display: "'Cabinet Grotesk', sans-serif", body: "'DM Sans', sans-serif" },
  slab: { display: "'Zilla Slab', serif", body: "'IBM Plex Sans', sans-serif" },
  humanist: { display: "'Nunito', sans-serif", body: "'Nunito Sans', sans-serif" },
  condensed: { display: "'Barlow Condensed', sans-serif", body: "'Barlow', sans-serif" },
  geometric: { display: "'Outfit', sans-serif", body: "'Outfit', sans-serif" },
  retro: { display: "'Syne', sans-serif", body: "'Syne', sans-serif" },
};

const SPEED_MAP: Record<AnimationSpeed, { duration: string; stagger: string }> = {
  slowest:  { duration: '2400ms', stagger: '300ms' },
  slow:     { duration: '1400ms', stagger: '180ms' },
  default:  { duration: '800ms',  stagger: '100ms' },
  fast:     { duration: '400ms',  stagger: '50ms' },
  fastest:  { duration: '200ms',  stagger: '25ms' },
};

/**
 * Applies a Theme object to the DOM by setting data-theme attribute,
 * font overrides (unless style-default), and animation speed variables.
 */
export function applyTheme(theme: Theme, element: HTMLElement): void {
  element.setAttribute('data-theme', theme.base);

  // Fonts: only override if not using style default
  if (theme.fontPair === 'style-default') {
    // Remove any inline font overrides so CSS theme file takes effect
    element.style.removeProperty('--page-font-display');
    element.style.removeProperty('--page-font-body');
  } else {
    const resolved = resolveFontPair(theme);
    const fonts = FONT_MAP[resolved];
    if (fonts) {
      element.style.setProperty('--page-font-display', fonts.display);
      element.style.setProperty('--page-font-body', fonts.body);
    }
    // Dynamically load the Google Fonts for this font pair
    loadThemeFonts(resolved);
  }

  // Animation speed
  const speed = SPEED_MAP[theme.animationSpeed ?? 'default'];
  element.style.setProperty('--entrance-duration', speed.duration);
  element.style.setProperty('--entrance-stagger', speed.stagger);
}

/**
 * Returns the CSS class for the selected entrance animation.
 */
export function getAnimationClass(animation: Theme['animation']): string {
  if (animation === 'none') return '';
  return `animate-entrance-${animation}`;
}
