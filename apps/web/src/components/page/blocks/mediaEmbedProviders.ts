export type MediaEmbedCategory = 'video' | 'audio' | 'social' | 'article';
export type MediaEmbedRenderMode = 'iframe' | 'widget' | 'oembed' | 'fallback';

export interface MediaEmbedProvider {
  id: string;
  label: string;
  category: MediaEmbedCategory;
  match: RegExp;
  renderMode: MediaEmbedRenderMode;
  getEmbedSrc?: (url: string) => string | null;
  height?: number;
  aspectRatio?: string;
}

export const MEDIA_EMBED_PROVIDERS: MediaEmbedProvider[] = [
  // Video
  {
    id: 'youtube',
    label: 'YouTube',
    category: 'video',
    match: /youtube\.com|youtu\.be/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
    },
    aspectRatio: '16 / 9',
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    category: 'video',
    match: /vimeo\.com\/(\d+)/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?dnt=1` : null;
    },
    aspectRatio: '16 / 9',
  },
  // Audio
  {
    id: 'spotify',
    label: 'Spotify',
    category: 'audio',
    match: /open\.spotify\.com/,
    renderMode: 'iframe',
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
    category: 'audio',
    match: /soundcloud\.com/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%230d9488&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
    height: 166,
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    category: 'audio',
    match: /music\.apple\.com/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => url.replace('music.apple.com', 'embed.music.apple.com'),
    height: 175,
  },
  {
    id: 'tidal',
    label: 'Tidal',
    category: 'audio',
    match: /tidal\.com\/(track|album|playlist)\/(\d+)/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => {
      const match = url.match(/tidal\.com\/(track|album|playlist)\/(\d+)/);
      return match ? `https://embed.tidal.com/${match[1]}s/${match[2]}` : null;
    },
    height: 152,
  },
  {
    id: 'bandcamp',
    label: 'Bandcamp',
    category: 'audio',
    match: /bandcamp\.com/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => `https://bandcamp.com/EmbeddedPlayer/v=2/url=${encodeURIComponent(url)}/size=large/tracklist=false/artwork=small/`,
    height: 152,
  },
  // Article
  {
    id: 'substack',
    label: 'Substack',
    category: 'article',
    match: /substack\.com/,
    renderMode: 'iframe',
    getEmbedSrc: (url) => url.endsWith('/embed') ? url : `${url}/embed`,
    aspectRatio: '16 / 9',
  },
  // Social
  {
    id: 'twitter',
    label: 'X / Twitter',
    category: 'social',
    match: /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/,
    renderMode: 'widget',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    category: 'social',
    match: /tiktok\.com/,
    renderMode: 'widget',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    category: 'social',
    match: /bsky\.app/,
    renderMode: 'oembed',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    category: 'social',
    match: /instagram\.com/,
    renderMode: 'fallback',
  },
];

/** Detect provider from a URL. Returns null if no match. */
export function detectMediaEmbedProvider(url: string): MediaEmbedProvider | null {
  for (const provider of MEDIA_EMBED_PROVIDERS) {
    if (provider.match.test(url)) return provider;
  }
  return null;
}

/** Normalize data from old embed/social-post formats to media-embed format */
export function normalizeMediaEmbedData(data: Record<string, unknown>) {
  return {
    url: (data.url || data.embed_url || data.post_url || '') as string,
    platform: (data.platform || data.embed_type || '') as string,
    fallback_text: (data.fallback_text || undefined) as string | undefined,
  };
}
