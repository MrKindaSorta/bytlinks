import type { EmbedType } from '@bytlinks/shared';

export interface EmbedProvider {
  id: EmbedType;
  label: string;
  match: RegExp;
  getEmbedSrc: (url: string) => string | null;
  height?: number;
  aspectRatio?: string;
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    match: /youtube\.com|youtu\.be/,
    getEmbedSrc: (url) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
    },
    aspectRatio: '16 / 9',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    match: /open\.spotify\.com/,
    getEmbedSrc: (url) => {
      const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
      if (!match) return null;
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
    },
    height: 152,
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    match: /soundcloud\.com/,
    getEmbedSrc: (url) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%230d9488&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
    height: 166,
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    match: /vimeo\.com\/(\d+)/,
    getEmbedSrc: (url) => {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?dnt=1` : null;
    },
    aspectRatio: '16 / 9',
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    match: /music\.apple\.com/,
    getEmbedSrc: (url) => url.replace('music.apple.com', 'embed.music.apple.com'),
    height: 175,
  },
];

/** Detect provider from a URL. Returns null if no match. */
export function detectEmbedProvider(url: string): EmbedProvider | null {
  for (const provider of EMBED_PROVIDERS) {
    if (provider.match.test(url)) return provider;
  }
  return null;
}

/** Get embed src from a URL using the registered providers. */
export function getEmbedSrcFromUrl(url: string): { provider: EmbedProvider; src: string } | null {
  const provider = detectEmbedProvider(url);
  if (!provider) return null;
  const src = provider.getEmbedSrc(url);
  if (!src) return null;
  return { provider, src };
}
