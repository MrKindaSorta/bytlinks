import { Hono } from 'hono';
import type { Env } from '../index';
import { decryptCredential } from '../utils/crypto';
import { syncToMailchimp, syncToConvertKit } from '../utils/emailProviders';
import type { NewsletterData, FileDownloadData } from '@bytlinks/shared';
import { getDownloadCount } from './analytics';

export const publicRoutes = new Hono<{ Bindings: Env }>();

/** IP-based rate limiter for newsletter signups — 10 per IP per hour */
const newsletterRateMap = new Map<string, { count: number; resetAt: number }>();

function checkNewsletterRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = newsletterRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    newsletterRateMap.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

/**
 * GET /api/public/avatar/:key+ — serve avatar from R2
 */
publicRoutes.get('/avatar/*', async (c) => {
  const key = c.req.path.replace('/api/public/avatar/', '');

  try {
    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, { headers });
  } catch {
    return c.json({ success: false, error: 'Failed to load image' }, 500);
  }
});

/**
 * GET /api/public/file/:key+ — serve file from R2 (blocks uploads)
 */
publicRoutes.get('/file/*', async (c) => {
  const key = c.req.path.replace('/api/public/file/', '');

  try {
    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, { headers });
  } catch {
    return c.json({ success: false, error: 'Failed to load file' }, 500);
  }
});

/**
 * GET /api/public/block/:blockId/download-count — public download count badge
 * Returns { count: number } only if show_download_count is true AND count >= count_min_threshold.
 * Otherwise returns { count: null }.
 */
publicRoutes.get('/block/:blockId/download-count', async (c) => {
  const blockId = c.req.param('blockId');

  try {
    const block = await c.env.DB.prepare(
      'SELECT data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'file-download').first<{ data: string }>();

    if (!block) {
      return c.json({ count: null });
    }

    const data = JSON.parse(block.data) as FileDownloadData;
    if (!data.show_download_count) {
      return c.json({ count: null });
    }

    const minThreshold = data.count_min_threshold ?? 50;
    const count = await getDownloadCount(c.env.DB, blockId);

    if (count >= minThreshold) {
      return c.json({ count });
    }
    return c.json({ count: null });
  } catch {
    return c.json({ count: null });
  }
});

/**
 * POST /api/public/poll/:blockId/vote — cast a poll vote (cookie-gated)
 */
publicRoutes.post('/poll/:blockId/vote', async (c) => {
  const blockId = c.req.param('blockId');
  const body = await c.req.json<{ option_id: string }>();

  if (!body.option_id) {
    return c.json({ success: false, error: 'option_id is required' }, 400);
  }

  // Check cookie for prior vote
  const cookieName = `poll_${blockId}`;
  const cookies = c.req.header('cookie') || '';
  if (cookies.includes(cookieName)) {
    return c.json({ success: false, error: 'Already voted' }, 409);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'poll').first<{ id: string; data: string }>();

    if (!block) {
      return c.json({ success: false, error: 'Poll not found' }, 404);
    }

    const pollData = JSON.parse(block.data);
    const isPastEndDate = pollData.end_date
      ? new Date(pollData.end_date).getTime() < Date.now()
      : false;
    if (pollData.closed || isPastEndDate) {
      return c.json({ success: false, error: 'Poll is closed' }, 403);
    }

    const option = pollData.options.find((o: { id: string }) => o.id === body.option_id);
    if (!option) {
      return c.json({ success: false, error: 'Invalid option' }, 400);
    }

    option.votes = (option.votes || 0) + 1;

    await c.env.DB.prepare(
      'UPDATE content_blocks SET data = ? WHERE id = ?'
    ).bind(JSON.stringify(pollData), blockId).run();

    // Set cookie to prevent re-voting (30 days)
    const res = c.json({ success: true, data: pollData });
    res.headers.set('Set-Cookie', `${cookieName}=1; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res;
  } catch {
    return c.json({ success: false, error: 'Failed to vote' }, 500);
  }
});

/**
 * POST /api/public/newsletter/:blockId — submit email signup
 */
publicRoutes.post('/newsletter/:blockId', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  if (!checkNewsletterRateLimit(ip)) {
    return c.json({ success: false, error: 'Too many requests' }, 429);
  }

  const blockId = c.req.param('blockId');
  const body = await c.req.json<{ email: string }>();

  if (!body.email || !body.email.includes('@')) {
    return c.json({ success: false, error: 'Valid email is required' }, 400);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'newsletter').first<{ id: string; data: string }>();

    if (!block) {
      return c.json({ success: false, error: 'Newsletter not found' }, 404);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO newsletter_signups (id, block_id, email) VALUES (?, ?, ?)'
    ).bind(id, blockId, body.email).run();

    // Sync to email provider if configured
    const blockData = JSON.parse(block.data) as NewsletterData;
    const syncProvider = blockData.sync_provider;

    if (syncProvider && syncProvider !== 'none' && c.env.CREDENTIALS_ENCRYPTION_KEY) {
      const encKey = c.env.CREDENTIALS_ENCRYPTION_KEY;
      const email = body.email;

      // Use ctx.waitUntil so the response is sent immediately
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const cred = await c.env.DB.prepare(
              'SELECT encrypted_key, metadata FROM provider_credentials WHERE block_id = ? AND provider = ? LIMIT 1'
            ).bind(blockId, syncProvider).first<{ encrypted_key: string; metadata: string | null }>();

            if (!cred) return;

            const apiKey = await decryptCredential(cred.encrypted_key, encKey);
            if (!apiKey) return;

            if (syncProvider === 'mailchimp') {
              const meta = cred.metadata ? JSON.parse(cred.metadata) as { audience_id?: string; datacenter?: string } : {};
              const audienceId = blockData.mailchimp_audience_id || meta.audience_id || '';
              const datacenter = blockData.mailchimp_datacenter || meta.datacenter;
              if (audienceId) {
                await syncToMailchimp(email, apiKey, audienceId, datacenter);
              }
            } else if (syncProvider === 'convertkit') {
              const formId = blockData.convertkit_form_id || '';
              if (formId) {
                await syncToConvertKit(email, apiKey, formId);
              }
            }
          } catch {
            // Sync failure is non-critical — subscriber is already saved locally
          }
        })()
      );
    }

    // If no rows changed, email already existed — still return success to user
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to subscribe' }, 500);
  }
});

/**
 * POST /api/public/event/:blockId/interested — mark interest via cookie (no body)
 */
publicRoutes.post('/event/:blockId/interested', async (c) => {
  const blockId = c.req.param('blockId');
  const cookieName = `event_interested_${blockId}`;
  const cookies = c.req.header('cookie') || '';

  if (cookies.includes(cookieName)) {
    // Already marked — just return current count
    try {
      const block = await c.env.DB.prepare(
        'SELECT data FROM content_blocks WHERE id = ? AND block_type = ?'
      ).bind(blockId, 'event').first<{ data: string }>();
      if (!block) return c.json({ success: false, error: 'Event not found' }, 404);
      const eventData = JSON.parse(block.data);
      return c.json({ interested_count: eventData.interested_count || 0 });
    } catch {
      return c.json({ success: false, error: 'Failed' }, 500);
    }
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'event').first<{ id: string; data: string }>();

    if (!block) return c.json({ success: false, error: 'Event not found' }, 404);

    const eventData = JSON.parse(block.data);
    if (!eventData.rsvp_enabled) return c.json({ success: false, error: 'RSVP not enabled' }, 403);

    eventData.interested_count = (eventData.interested_count || 0) + 1;

    await c.env.DB.prepare(
      'UPDATE content_blocks SET data = ? WHERE id = ?'
    ).bind(JSON.stringify(eventData), blockId).run();

    // Also insert an rsvp row for tracking
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO event_rsvps (id, block_id, type) VALUES (?, ?, ?)'
    ).bind(id, blockId, 'interested').run();

    const res = c.json({ interested_count: eventData.interested_count });
    res.headers.set('Set-Cookie', `${cookieName}=1; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res;
  } catch {
    return c.json({ success: false, error: 'Failed to mark interest' }, 500);
  }
});

/**
 * POST /api/public/event/:blockId/rsvp — submit RSVP form
 */
publicRoutes.post('/event/:blockId/rsvp', async (c) => {
  const blockId = c.req.param('blockId');
  const body = await c.req.json<{ name?: string; email: string }>();

  if (!body.email || !body.email.includes('@')) {
    return c.json({ success: false, error: 'Valid email is required' }, 400);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'event').first<{ id: string; data: string }>();

    if (!block) return c.json({ success: false, error: 'Event not found' }, 404);

    const eventData = JSON.parse(block.data);
    if (!eventData.rsvp_enabled) return c.json({ success: false, error: 'RSVP not enabled' }, 403);
    if (eventData.rsvp_mode === 'interested') {
      return c.json({ success: false, error: 'Full RSVP not available for this event' }, 403);
    }

    // Check cap
    if (eventData.rsvp_cap) {
      const count = await c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM event_rsvps WHERE block_id = ? AND type = 'rsvp'"
      ).bind(blockId).first<{ cnt: number }>();
      if (count && count.cnt >= eventData.rsvp_cap) {
        return c.json({ success: false, error: 'RSVP capacity reached' }, 409);
      }
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO event_rsvps (id, block_id, type, name, email) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, blockId, 'rsvp', body.name || null, body.email).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to submit RSVP' }, 500);
  }
});

/**
 * GET /api/public/batch-profiles?usernames=alice,bob,carol — fetch multiple profiles in one query
 */
publicRoutes.get('/batch-profiles', async (c) => {
  const raw = c.req.query('usernames');
  if (!raw) return c.json({ success: false, error: 'usernames param is required' }, 400);

  const usernames = raw.split(',').map((u) => u.trim()).filter(Boolean).slice(0, 20);
  if (usernames.length === 0) return c.json({ success: true, data: [] });

  try {
    const placeholders = usernames.map(() => '?').join(',');
    const rows = await c.env.DB.prepare(
      `SELECT username, display_name, bio, job_title, profession, avatar_r2_key FROM bio_pages WHERE username IN (${placeholders}) AND is_published = 1`
    ).bind(...usernames).all();

    return c.json({
      success: true,
      data: rows.results.map((r: Record<string, unknown>) => ({
        username: r.username,
        display_name: r.display_name,
        bio: r.bio,
        job_title: r.job_title,
        profession: r.profession,
        avatar_r2_key: r.avatar_r2_key,
      })),
    });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch profiles' }, 500);
  }
});

/**
 * GET /api/public/:username — fetch a public bio page with all content
 */
publicRoutes.get('/:username', async (c) => {
  const username = c.req.param('username');

  try {
    const page = await c.env.DB.prepare(
      'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
    ).bind(username).first();

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    const [links, socialLinks, embeds, blocks, owner] = await Promise.all([
      c.env.DB.prepare(
        `SELECT * FROM links WHERE page_id = ? AND is_visible = 1
         AND (published_at IS NULL OR published_at <= ?)
         AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY order_num`
      ).bind(page.id, now, now).all(),
      c.env.DB.prepare(
        'SELECT * FROM social_links WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM embed_blocks WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM content_blocks WHERE page_id = ? AND is_visible = 1 ORDER BY created_at'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT verified FROM users WHERE id = ?'
      ).bind(page.user_id).first<{ verified: number }>(),
    ]);

    const sectionOrder = page.section_order
      ? JSON.parse(page.section_order as string)
      : null;

    return c.json({
      success: true,
      data: {
        verified: !!(owner?.verified),
        page: {
          ...page,
          theme: JSON.parse(page.theme as string),
          section_order: sectionOrder,
          job_title: page.job_title ?? null,
          profession: page.profession ?? null,
        },
        links: links.results.map((l: Record<string, unknown>) => ({
          ...l,
          style_overrides: l.style_overrides ? JSON.parse(l.style_overrides as string) : null,
        })),
        socialLinks: socialLinks.results,
        embeds: embeds.results,
        blocks: blocks.results
          .map((b: Record<string, unknown>) => ({
            ...b,
            data: JSON.parse(b.data as string),
            is_visible: !!b.is_visible,
          }))
          .filter((b: Record<string, unknown>) => {
            // Auto-hide past events
            if (b.block_type === 'event') {
              const eventDate = (b.data as { event_date?: string }).event_date;
              if (eventDate && new Date(eventDate).getTime() < Date.now()) return false;
            }
            return true;
          }),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});
