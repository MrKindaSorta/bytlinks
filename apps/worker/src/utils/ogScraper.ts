/** Lightweight OG metadata scraper for Cloudflare Workers (no DOM library). */

export interface OgMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
}

function extractMeta(html: string, property: string): string | null {
  // Match <meta property="og:title" content="..."> or <meta name="..." content="...">
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']` +
    `|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    'i',
  );
  const match = html.match(regex);
  if (match) return match[1] || match[2] || null;
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

/** In-memory cache — keys expire after 1 hour. */
const cache = new Map<string, { data: OgMetadata; expiresAt: number }>();

export async function scrapeOg(url: string): Promise<OgMetadata> {
  const cached = cache.get(url);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BytLinksBot/1.0 (+https://bytlinks.com)',
      Accept: 'text/html',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(5000),
  });

  // Only read first 32KB to stay fast
  const reader = res.body?.getReader();
  if (!reader) return { title: null, description: null, image: null, site_name: null };

  let html = '';
  const decoder = new TextDecoder();
  while (html.length < 32768) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  reader.cancel();

  const data: OgMetadata = {
    title: extractMeta(html, 'og:title') || extractTitle(html),
    description: extractMeta(html, 'og:description') || extractMeta(html, 'description'),
    image: extractMeta(html, 'og:image'),
    site_name: extractMeta(html, 'og:site_name'),
  };

  cache.set(url, { data, expiresAt: Date.now() + 3600_000 });
  return data;
}
