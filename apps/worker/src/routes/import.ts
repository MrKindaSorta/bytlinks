import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { isBlockedUrl } from '../validators/nsfw';
import {
  detectPlatform,
  parseLinktreePage,
  parseGenericPage,
  parseCsv,
  isPrivateUrl,
  type ParsedLink,
} from '../utils/parsers';

export const importRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

importRoutes.use('*', authMiddleware);

/** Rate limit: max 3 parse attempts per hour per user */
async function checkRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
  const count = await db.prepare(
    'SELECT COUNT(*) as cnt FROM import_rate_limits WHERE user_id = ? AND attempted_at > ?'
  ).bind(userId, oneHourAgo).first<{ cnt: number }>();
  return (count?.cnt ?? 0) < 3;
}

async function recordAttempt(db: D1Database, userId: string): Promise<void> {
  await db.prepare(
    'INSERT INTO import_rate_limits (user_id, attempted_at) VALUES (?, ?)'
  ).bind(userId, Math.floor(Date.now() / 1000)).run();
}

/**
 * POST /api/import/parse — extract links from URL or CSV (no data written)
 */
importRoutes.post('/parse', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    source: 'url' | 'csv';
    url?: string;
    csv?: string;
  }>();

  // Rate limit check
  const allowed = await checkRateLimit(c.env.DB, user.id);
  if (!allowed) {
    return c.json({ success: false, error: 'Rate limit exceeded. Try again in an hour.' }, 429);
  }
  await recordAttempt(c.env.DB, user.id);

  try {
    let links: ParsedLink[] = [];
    let sourceType = 'unknown';

    if (body.source === 'csv' && body.csv) {
      links = parseCsv(body.csv);
      sourceType = 'csv';
    } else if (body.source === 'url' && body.url) {
      // SSRF protection
      if (isPrivateUrl(body.url)) {
        return c.json({ success: false, error: 'URL not allowed' }, 400);
      }

      sourceType = detectPlatform(body.url);

      // Fetch with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(body.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BytLinks/1.0)' },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return c.json({ success: false, error: `Failed to fetch URL (${res.status})` }, 400);
      }

      // Cap response at 2MB
      const text = await res.text();
      if (text.length > 2 * 1024 * 1024) {
        return c.json({ success: false, error: 'Page too large to parse' }, 400);
      }

      if (sourceType === 'linktree') {
        links = parseLinktreePage(text);
      }

      // Fallback to generic if Linktree parse failed or not a Linktree
      if (links.length === 0) {
        links = parseGenericPage(text, body.url);
      }
    } else {
      return c.json({ success: false, error: 'Invalid source type or missing data' }, 400);
    }

    // Check each link against blocklist
    links = links.map((link) => {
      if (isBlockedUrl(link.url)) {
        return { ...link, blocked: true, blocked_reason: 'Blocked domain' };
      }
      return link;
    });

    return c.json({
      success: true,
      data: { source_type: sourceType, links },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return c.json({ success: false, error: 'Request timed out' }, 408);
    }
    return c.json({ success: false, error: 'Failed to parse links' }, 500);
  }
});

/**
 * POST /api/import/commit — bulk-create selected links
 */
importRoutes.post('/commit', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    links: { title: string; url: string; description?: string; icon?: string }[];
  }>();

  if (!body.links || !Array.isArray(body.links) || body.links.length === 0) {
    return c.json({ success: false, error: 'No links to import' }, 400);
  }

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    // Check total link count cap
    const existing = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM links WHERE page_id = ?'
    ).bind(page.id).first<{ cnt: number }>();

    const currentCount = existing?.cnt ?? 0;
    const maxLinks = 100;
    const available = maxLinks - currentCount;

    if (available <= 0) {
      return c.json({ success: false, error: 'Link limit reached (max 100)' }, 400);
    }

    // Get current max order
    const maxOrder = await c.env.DB.prepare(
      'SELECT MAX(order_num) as max_order FROM links WHERE page_id = ?'
    ).bind(page.id).first<{ max_order: number | null }>();
    let nextOrder = (maxOrder?.max_order ?? -1) + 1;

    const validLinks = body.links
      .filter((l) => l.title && l.url && !isBlockedUrl(l.url))
      .slice(0, available);

    const skipped = body.links.length - validLinks.length;

    const statements = validLinks.map((l) => {
      const id = crypto.randomUUID();
      const order = nextOrder++;
      return c.env.DB.prepare(
        `INSERT INTO links (id, page_id, title, url, description, icon, order_num)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, page.id, l.title, l.url, l.description ?? null, l.icon ?? null, order);
    });

    if (statements.length > 0) {
      await c.env.DB.batch(statements);
    }

    return c.json({
      success: true,
      data: { created: validLinks.length, skipped },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to import links' }, 500);
  }
});
