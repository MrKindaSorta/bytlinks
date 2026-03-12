/**
 * Dynamic Google Fonts loader — only loads fonts needed for a given theme's fontPair.
 * Replaces the static 14-family link tag in index.html.
 */

/** Maps fontPair ID → [displayFontFamily, bodyFontFamily] */
const FONT_PAIR_MAP: Record<string, [string, string]> = {
  'mono-serif': ['JetBrains Mono:wght@400;700', 'Lora:wght@400;700'],
  'editorial': ['Playfair Display:wght@400;700;900', 'Source Sans 3:wght@300;400;600'],
  'grotesque': ['Cabinet Grotesk:wght@400;500;700;900', 'DM Sans:wght@300;400;500;700'],
  'slab': ['Zilla Slab:wght@400;700', 'IBM Plex Sans:wght@300;400;600'],
  'humanist': ['Nunito:wght@400;700;900', 'Nunito Sans:wght@300;400;600'],
  'condensed': ['Barlow Condensed:wght@400;600;700', 'Barlow:wght@300;400;600'],
  'geometric': ['Outfit:wght@300;400;600;700', 'Outfit:wght@300;400;600;700'],
  'retro': ['Syne:wght@400;600;700;800', 'Syne:wght@400;600;700;800'],
};

/** Default fonts for marketing pages (homepage, auth, etc.) */
const MARKETING_FONTS = ['Cabinet Grotesk:wght@400;500;700;900', 'DM Sans:wght@300;400;500;700'];

const LINK_ID = 'dynamic-google-fonts';

function buildGoogleFontsUrl(families: string[]): string {
  const unique = [...new Set(families)];
  const params = unique.map((f) => `family=${f.replace(/ /g, '+')}`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function injectLink(url: string): void {
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (link) {
    if (link.href === url) return; // Already loaded
    link.href = url;
  } else {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}

/** Load fonts for a specific theme fontPair. */
export function loadThemeFonts(fontPair: string): void {
  const fonts = FONT_PAIR_MAP[fontPair];
  if (!fonts) {
    // Unknown font pair — load marketing defaults
    loadMarketingFonts();
    return;
  }
  injectLink(buildGoogleFontsUrl(fonts));
}

/** Load just the marketing page fonts (homepage, auth pages). */
export function loadMarketingFonts(): void {
  injectLink(buildGoogleFontsUrl(MARKETING_FONTS));
}

/** Get the Google Fonts URL for a given fontPair (used by edge meta injection). */
export function getFontUrlForPair(fontPair: string): string {
  const fonts = FONT_PAIR_MAP[fontPair] || MARKETING_FONTS;
  return buildGoogleFontsUrl(fonts);
}

export { FONT_PAIR_MAP };
