/** Parsed link from an external source */
export interface ParsedLink {
  title: string;
  url: string;
  blocked?: boolean;
  blocked_reason?: string;
}

/** Detect which platform a URL belongs to */
export function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('linktr.ee')) return 'linktree';
    if (hostname.includes('beacons.ai')) return 'beacons';
    if (hostname.includes('bio.link')) return 'biolink';
    if (hostname.includes('campsite.bio')) return 'campsite';
    if (hostname.includes('stan.store')) return 'stan';
    return 'generic';
  } catch {
    return 'unknown';
  }
}

/** Parse a Linktree page by extracting __NEXT_DATA__ JSON */
export function parseLinktreePage(html: string): ParsedLink[] {
  const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) return [];

  try {
    const data = JSON.parse(match[1]);
    const links = data?.props?.pageProps?.links;
    if (!Array.isArray(links)) return [];

    return links
      .filter((l: { url?: string }) => l.url)
      .map((l: { title?: string; url: string }) => ({
        title: stripTags(l.title || '') || new URL(l.url).hostname,
        url: l.url,
      }));
  } catch {
    return [];
  }
}

/** Parse a generic page by extracting <a href> tags */
export function parseGenericPage(html: string, sourceUrl: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const seen = new Set<string>();

  // Match <a href="...">...</a>
  const regex = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  let sourceHost = '';
  try { sourceHost = new URL(sourceUrl).hostname; } catch { /* ignore */ }

  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    const innerHtml = match[2];
    const title = stripTags(innerHtml).trim();

    if (!url || !title) continue;
    // Skip anchors, javascript:, mailto:
    if (url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) continue;

    // Resolve relative URLs
    let absoluteUrl = url;
    try {
      absoluteUrl = new URL(url, sourceUrl).href;
    } catch {
      continue;
    }

    // Skip internal links (same host)
    try {
      if (new URL(absoluteUrl).hostname === sourceHost) continue;
    } catch {
      continue;
    }

    if (seen.has(absoluteUrl)) continue;
    seen.add(absoluteUrl);

    links.push({ title, url: absoluteUrl });
  }

  return links;
}

/** Parse CSV text with Title/URL columns */
export function parseCsv(csv: string): ParsedLink[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const titleIdx = header.indexOf('title');
  const urlIdx = header.indexOf('url');

  if (urlIdx === -1) return [];

  const links: ParsedLink[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const url = cols[urlIdx]?.trim();
    if (!url) continue;
    const title = (titleIdx >= 0 ? cols[titleIdx]?.trim() : '') || url;
    links.push({ title, url });
  }

  return links;
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/** Strip HTML tags from a string */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Check if a URL points to a private/internal IP (SSRF protection) */
export function isPrivateUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (hostname === '0.0.0.0') return true;
    // Check private IP ranges
    if (/^10\./.test(hostname)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;
    return false;
  } catch {
    return true;
  }
}
