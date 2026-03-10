import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { fetchLiveStat } from '../utils/liveStats';
import { scrapeGoogleReviews, scrapeTrustpilotReviews } from '../utils/reviewScrapers';
import { encryptCredential } from '../utils/crypto';
import type { TestimonialsData, TestimonialItem } from '@bytlinks/shared';

export const utilRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

utilRoutes.use('*', authMiddleware);

/* ─────────────────────────────────────────────────────────────
   Separate router for /api/event-rsvps/:blockId endpoints
   Mounted in index.ts at /api/event-rsvps
───────────────────────────────────────────────────────────── */
export const eventRsvpRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

eventRsvpRoutes.use('*', authMiddleware);

/**
 * GET /api/event-rsvps/:blockId — paginated RSVP list (full-form RSVPs only)
 */
eventRsvpRoutes.get('/:blockId', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('blockId');

  const pageParam = parseInt(c.req.query('page') ?? '1', 10);
  const limitParam = parseInt(c.req.query('limit') ?? '25', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = isNaN(limitParam) || limitParam < 1 ? 25 : Math.min(limitParam, 100);

  try {
    // Verify block ownership
    const ownedPage = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();
    if (!ownedPage) return c.json({ success: false, error: 'No page found' }, 404);

    const block = await c.env.DB.prepare(
      "SELECT id FROM content_blocks WHERE id = ? AND page_id = ? AND block_type = 'event'"
    ).bind(blockId, ownedPage.id).first();
    if (!block) return c.json({ success: false, error: 'Event block not found' }, 404);

    const offset = (page - 1) * limit;

    const [countRow, rows] = await Promise.all([
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM event_rsvps WHERE block_id = ? AND type = 'rsvp'"
      ).bind(blockId).first<{ count: number }>(),

      c.env.DB.prepare(
        "SELECT id, name, email, created_at FROM event_rsvps WHERE block_id = ? AND type = 'rsvp' ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).bind(blockId, limit, offset).all(),
    ]);

    const total = countRow?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return c.json({
      success: true,
      data: rows.results,
      total,
      page,
      total_pages: totalPages,
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load RSVPs' }, 500);
  }
});

/**
 * GET /api/event-rsvps/:blockId/export — CSV export of all RSVPs
 */
eventRsvpRoutes.get('/:blockId/export', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('blockId');

  try {
    // Verify block ownership
    const ownedPage = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();
    if (!ownedPage) return c.json({ success: false, error: 'No page found' }, 404);

    const block = await c.env.DB.prepare(
      "SELECT id FROM content_blocks WHERE id = ? AND page_id = ? AND block_type = 'event'"
    ).bind(blockId, ownedPage.id).first();
    if (!block) return c.json({ success: false, error: 'Event block not found' }, 404);

    const rows = await c.env.DB.prepare(
      "SELECT name, email, created_at FROM event_rsvps WHERE block_id = ? AND type = 'rsvp' ORDER BY created_at DESC"
    ).bind(blockId).all<{ name: string | null; email: string; created_at: string | number }>();

    const header = 'Name,Email,Date';
    const lines = (rows.results ?? []).map((r) => {
      const name = (r.name ?? '').replace(/"/g, '""');
      const email = r.email.replace(/"/g, '""');
      const date = r.created_at ? String(r.created_at) : '';
      return `"${name}","${email}","${date}"`;
    });

    const csv = [header, ...lines].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="rsvps-${blockId}.csv"`,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to export RSVPs' }, 500);
  }
});

/**
 * POST /api/utils/stats-refresh — refresh a live stat value
 */
utilRoutes.post('/stats-refresh', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ block_id: string; stat_id: string }>();

  if (!body.block_id || !body.stat_id) {
    return c.json({ success: false, error: 'block_id and stat_id are required' }, 400);
  }

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();
    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    const block = await c.env.DB.prepare(
      'SELECT data FROM content_blocks WHERE id = ? AND page_id = ? AND block_type = ?'
    ).bind(body.block_id, page.id, 'stats').first<{ data: string }>();
    if (!block) return c.json({ success: false, error: 'Stats block not found' }, 404);

    const data = JSON.parse(block.data) as { items: Record<string, unknown>[]; animate?: boolean };
    const itemIndex = data.items.findIndex((it) => it.id === body.stat_id);
    if (itemIndex === -1) return c.json({ success: false, error: 'Stat item not found' }, 404);

    const item = data.items[itemIndex];
    const source = item.source as string;
    const sourceUrl = item.source_url as string;

    if (!source || source === 'manual' || !sourceUrl) {
      return c.json({ success: false, error: 'This stat is not configured for live data' }, 400);
    }

    const env = {
      SPOTIFY_CLIENT_ID: c.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: c.env.SPOTIFY_CLIENT_SECRET,
      YOUTUBE_API_KEY: c.env.YOUTUBE_API_KEY,
    };

    const result = await fetchLiveStat(source, sourceUrl, env);

    if ('error' in result) {
      // Check if it's a credentials issue
      if (result.error.includes('not set')) {
        return c.json({ success: false, error: result.error }, 503);
      }
      return c.json({ success: false, error: result.error }, 400);
    }

    // Update the stat item
    data.items[itemIndex] = {
      ...item,
      live_value: result.value,
      last_fetched_at: Math.floor(Date.now() / 1000),
    };

    await c.env.DB.prepare(
      'UPDATE content_blocks SET data = ? WHERE id = ?'
    ).bind(JSON.stringify(data), body.block_id).run();

    return c.json({ success: true, data: { value: result.value } });
  } catch {
    return c.json({ success: false, error: 'Failed to refresh stat' }, 500);
  }
});

/**
 * POST /api/utils/testimonials/import — scrape reviews and merge into a testimonials block
 */
utilRoutes.post('/testimonials/import', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ block_id: string; source: 'google' | 'trustpilot'; url: string }>();

  if (!body.block_id || !body.source || !body.url) {
    return c.json({ success: false, error: 'block_id, source, and url are required' }, 400);
  }

  // Trustpilot is stubbed
  if (body.source === 'trustpilot') {
    const stub = scrapeTrustpilotReviews(body.url);
    return c.json({ success: false, error: stub.message, stubbed: true }, 503);
  }

  try {
    // Verify the block belongs to this user
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();
    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    const block = await c.env.DB.prepare(
      'SELECT data FROM content_blocks WHERE id = ? AND page_id = ? AND block_type = ?'
    ).bind(body.block_id, page.id, 'testimonials').first<{ data: string }>();
    if (!block) return c.json({ success: false, error: 'Testimonials block not found' }, 404);

    const blockData = JSON.parse(block.data) as TestimonialsData;

    // Scrape new reviews
    const scraped = await scrapeGoogleReviews(body.url);

    // Merge — no duplicates by source_url; items without source_url are always kept
    const existingUrls = new Set(
      (blockData.items || [])
        .map((it: TestimonialItem) => it.source_url)
        .filter(Boolean)
    );

    const newItems = scraped.items.filter(
      (it) => !it.source_url || !existingUrls.has(it.source_url)
    );

    const merged: TestimonialItem[] = [...(blockData.items || []), ...newItems];

    const updatedData: TestimonialsData = {
      ...blockData,
      items: merged,
      import_source: body.source,
      import_url: body.url,
      last_imported_at: Math.floor(Date.now() / 1000),
    };

    await c.env.DB.prepare(
      'UPDATE content_blocks SET data = ? WHERE id = ?'
    ).bind(JSON.stringify(updatedData), body.block_id).run();

    return c.json({ success: true, data: { imported: newItems.length, total: merged.length } });
  } catch {
    return c.json({ success: false, error: 'Failed to import reviews' }, 500);
  }
});

/**
 * POST /api/utils/newsletter/credentials — save encrypted provider API key
 */
utilRoutes.post('/newsletter/credentials', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    block_id: string;
    provider: 'mailchimp' | 'convertkit';
    api_key: string;
    metadata?: Record<string, string>;
  }>();

  if (!body.block_id || !body.provider || !body.api_key) {
    return c.json({ success: false, error: 'block_id, provider, and api_key are required' }, 400);
  }

  if (!c.env.CREDENTIALS_ENCRYPTION_KEY) {
    return c.json({ success: false, error: 'Credential encryption not configured' }, 503);
  }

  try {
    // Verify block ownership
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();
    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    const block = await c.env.DB.prepare(
      'SELECT id FROM content_blocks WHERE id = ? AND page_id = ? AND block_type = ?'
    ).bind(body.block_id, page.id, 'newsletter').first();
    if (!block) return c.json({ success: false, error: 'Newsletter block not found' }, 404);

    const encryptedKey = await encryptCredential(body.api_key, c.env.CREDENTIALS_ENCRYPTION_KEY);
    const metadata = body.metadata ? JSON.stringify(body.metadata) : null;
    const id = crypto.randomUUID();

    // Upsert: delete existing then insert
    await c.env.DB.prepare(
      'DELETE FROM provider_credentials WHERE block_id = ? AND provider = ?'
    ).bind(body.block_id, body.provider).run();

    await c.env.DB.prepare(
      'INSERT INTO provider_credentials (id, user_id, block_id, provider, encrypted_key, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, user.id, body.block_id, body.provider, encryptedKey, metadata).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to save credentials' }, 500);
  }
});

/**
 * POST /api/utils/newsletter/test-connection — verify provider credentials
 */
utilRoutes.post('/newsletter/test-connection', async (c) => {
  const body = await c.req.json<{
    provider: 'mailchimp' | 'convertkit';
    api_key: string;
    audience_id?: string;
    datacenter?: string;
    form_id?: string;
  }>();

  if (!body.provider || !body.api_key) {
    return c.json({ success: false, error: 'provider and api_key are required' }, 400);
  }

  try {
    if (body.provider === 'mailchimp') {
      // Mailchimp: call /3.0/ping to verify the key
      const dc = body.datacenter || body.api_key.split('-').pop() || 'us1';
      const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
        headers: { Authorization: `Basic ${btoa(`anystring:${body.api_key}`)}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return c.json({ success: true });
      const err = await res.json() as { detail?: string };
      return c.json({ success: false, error: err.detail || `HTTP ${res.status}` });
    }

    if (body.provider === 'convertkit') {
      // ConvertKit: list forms to verify the key
      const res = await fetch(`https://api.convertkit.com/v3/forms?api_key=${encodeURIComponent(body.api_key)}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return c.json({ success: true });
      const err = await res.json() as { error?: string; message?: string };
      return c.json({ success: false, error: err.message || err.error || `HTTP ${res.status}` });
    }

    return c.json({ success: false, error: 'Unknown provider' }, 400);
  } catch {
    return c.json({ success: false, error: 'Connection test failed' }, 500);
  }
});
