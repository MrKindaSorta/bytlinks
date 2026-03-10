import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const analyticsRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

/**
 * POST /api/analytics/track — public endpoint, no auth required.
 * Logs page_view or link_click events. Called from the public page.
 */
analyticsRoutes.post('/track', async (c) => {
  const body = await c.req.json<{
    page_id: string;
    link_id?: string;
    block_id?: string;
    event_type: string;
  }>();

  if (!body.page_id || !body.event_type) {
    return c.json({ success: false, error: 'page_id and event_type are required' }, 400);
  }

  try {
    const headers = c.req.raw.headers;
    const country = headers.get('cf-ipcountry') ?? null;
    const ua = headers.get('user-agent') ?? '';

    const deviceType = /Mobile|Android|iPhone/i.test(ua) ? 'mobile'
      : /Tablet|iPad/i.test(ua) ? 'tablet'
      : 'desktop';

    const browser = /Firefox/i.test(ua) ? 'Firefox'
      : /Edg/i.test(ua) ? 'Edge'
      : /Chrome/i.test(ua) ? 'Chrome'
      : /Safari/i.test(ua) ? 'Safari'
      : 'Other';

    const os = /Windows/i.test(ua) ? 'Windows'
      : /Mac/i.test(ua) ? 'macOS'
      : /Linux/i.test(ua) ? 'Linux'
      : /Android/i.test(ua) ? 'Android'
      : /iPhone|iPad/i.test(ua) ? 'iOS'
      : 'Other';

    const referrer = headers.get('referer') ?? null;

    await c.env.DB.prepare(
      `INSERT INTO analytics_events
       (id, page_id, link_id, event_type, referrer, country, device_type, browser, os, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      body.page_id,
      body.link_id ?? body.block_id ?? null,
      body.event_type,
      referrer,
      country,
      deviceType,
      browser,
      os,
      Math.floor(Date.now() / 1000),
    ).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to track event' }, 500);
  }
});

/* ── Protected analytics endpoints ── */
analyticsRoutes.use('/overview', authMiddleware);
analyticsRoutes.use('/referrers', authMiddleware);
analyticsRoutes.use('/countries', authMiddleware);
analyticsRoutes.use('/devices', authMiddleware);
analyticsRoutes.use('/link-performance', authMiddleware);
analyticsRoutes.use('/realtime', authMiddleware);
analyticsRoutes.use('/block-performance', authMiddleware);
analyticsRoutes.use('/newsletter-subscribers', authMiddleware);
analyticsRoutes.use('/booking-summary', authMiddleware);
analyticsRoutes.use('/newsletter-signups-by-day', authMiddleware);

/** Helper: get total file_download event count for a specific block */
export async function getDownloadCount(db: D1Database, blockId: string): Promise<number> {
  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM analytics_events WHERE link_id = ? AND event_type = 'file_download'`
  ).bind(blockId).first<{ count: number }>();
  return result?.count ?? 0;
}

/** Helper: get the user's page ID */
async function getPageId(c: any): Promise<string | null> {
  const user = c.get('user') as AuthUser;
  const page = await c.env.DB.prepare(
    'SELECT id FROM bio_pages WHERE user_id = ?'
  ).bind(user.id).first() as { id: string } | null;
  return page?.id ?? null;
}

/**
 * GET /api/analytics/overview — views, clicks, daily chart, weekly comparison
 */
analyticsRoutes.get('/overview', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 86400;
    const sixtyDaysAgo = now - 60 * 86400;
    const sevenDaysAgo = now - 7 * 86400;
    const fourteenDaysAgo = now - 14 * 86400;

    // Timezone offset in seconds from the browser (getTimezoneOffset() * 60).
    // Positive = behind UTC (e.g. EST = 18000). We subtract it to shift to local day.
    const tzParam = c.req.query('tz');
    const tzOffsetSec = tzParam ? parseInt(tzParam, 10) || 0 : 0;

    const [totalViews, totalClicks, daily, viewsThisWeek, viewsLastWeek, clicksThisWeek, clicksLastWeek] = await Promise.all([
      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view'`
      ).bind(pageId).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'link_click'`
      ).bind(pageId).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT DATE(timestamp - ?, 'unixepoch') as day,
                SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN event_type = 'link_click' THEN 1 ELSE 0 END) as clicks
         FROM analytics_events
         WHERE page_id = ? AND timestamp > ?
         GROUP BY day ORDER BY day`
      ).bind(tzOffsetSec, pageId, thirtyDaysAgo).all(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND timestamp > ?`
      ).bind(pageId, sevenDaysAgo).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND timestamp > ? AND timestamp <= ?`
      ).bind(pageId, fourteenDaysAgo, sevenDaysAgo).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'link_click' AND timestamp > ?`
      ).bind(pageId, sevenDaysAgo).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'link_click' AND timestamp > ? AND timestamp <= ?`
      ).bind(pageId, fourteenDaysAgo, sevenDaysAgo).first<{ count: number }>(),
    ]);

    const vThis = viewsThisWeek?.count ?? 0;
    const vLast = viewsLastWeek?.count ?? 0;
    const cThis = clicksThisWeek?.count ?? 0;
    const cLast = clicksLastWeek?.count ?? 0;

    return c.json({
      success: true,
      data: {
        total_views: totalViews?.count ?? 0,
        total_clicks: totalClicks?.count ?? 0,
        daily: daily.results,
        views_trend: vLast > 0 ? Math.round(((vThis - vLast) / vLast) * 100) : vThis > 0 ? 100 : 0,
        clicks_trend: cLast > 0 ? Math.round(((cThis - cLast) / cLast) * 100) : cThis > 0 ? 100 : 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load analytics' }, 500);
  }
});

/**
 * GET /api/analytics/referrers — top referrer domains
 */
analyticsRoutes.get('/referrers', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

    const result = await c.env.DB.prepare(
      `SELECT referrer, COUNT(*) as count
       FROM analytics_events
       WHERE page_id = ? AND event_type = 'page_view' AND referrer IS NOT NULL AND timestamp > ?
       GROUP BY referrer ORDER BY count DESC LIMIT 10`
    ).bind(pageId, thirtyDaysAgo).all();

    // Extract domain from full referrer URL
    const referrers = (result.results as { referrer: string; count: number }[]).map((r) => {
      try {
        const host = new URL(r.referrer).hostname.replace(/^www\./, '');
        return { source: host, count: r.count };
      } catch {
        return { source: r.referrer, count: r.count };
      }
    });

    // Merge duplicate domains
    const merged = new Map<string, number>();
    for (const r of referrers) {
      merged.set(r.source, (merged.get(r.source) ?? 0) + r.count);
    }

    const data = Array.from(merged.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return c.json({ success: true, data });
  } catch {
    return c.json({ success: false, error: 'Failed to load referrers' }, 500);
  }
});

/**
 * GET /api/analytics/countries — top countries
 */
analyticsRoutes.get('/countries', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

    const result = await c.env.DB.prepare(
      `SELECT country, COUNT(*) as count
       FROM analytics_events
       WHERE page_id = ? AND event_type = 'page_view' AND country IS NOT NULL AND timestamp > ?
       GROUP BY country ORDER BY count DESC LIMIT 15`
    ).bind(pageId, thirtyDaysAgo).all();

    return c.json({ success: true, data: result.results });
  } catch {
    return c.json({ success: false, error: 'Failed to load countries' }, 500);
  }
});

/**
 * GET /api/analytics/devices — device type, browser, OS breakdown
 */
analyticsRoutes.get('/devices', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

    const [deviceTypes, browsers, operatingSystems] = await Promise.all([
      c.env.DB.prepare(
        `SELECT device_type as name, COUNT(*) as count
         FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND device_type IS NOT NULL AND timestamp > ?
         GROUP BY device_type ORDER BY count DESC`
      ).bind(pageId, thirtyDaysAgo).all(),

      c.env.DB.prepare(
        `SELECT browser as name, COUNT(*) as count
         FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND browser IS NOT NULL AND timestamp > ?
         GROUP BY browser ORDER BY count DESC LIMIT 5`
      ).bind(pageId, thirtyDaysAgo).all(),

      c.env.DB.prepare(
        `SELECT os as name, COUNT(*) as count
         FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND os IS NOT NULL AND timestamp > ?
         GROUP BY os ORDER BY count DESC LIMIT 5`
      ).bind(pageId, thirtyDaysAgo).all(),
    ]);

    return c.json({
      success: true,
      data: {
        device_types: deviceTypes.results,
        browsers: browsers.results,
        operating_systems: operatingSystems.results,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load device data' }, 500);
  }
});

/**
 * GET /api/analytics/link-performance — CTR per link
 */
analyticsRoutes.get('/link-performance', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

    const [links, totalViews] = await Promise.all([
      c.env.DB.prepare(
        `SELECT l.id, l.title, l.url,
                COUNT(ae.id) as clicks
         FROM links l
         LEFT JOIN analytics_events ae
           ON ae.link_id = l.id AND ae.event_type = 'link_click' AND ae.timestamp > ?
         WHERE l.page_id = ? AND l.is_visible = 1
         GROUP BY l.id
         ORDER BY clicks DESC`
      ).bind(thirtyDaysAgo, pageId).all(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND timestamp > ?`
      ).bind(pageId, thirtyDaysAgo).first<{ count: number }>(),
    ]);

    const views = totalViews?.count ?? 0;
    const data = (links.results as { id: string; title: string; url: string; clicks: number }[]).map((link) => ({
      ...link,
      ctr: views > 0 ? Math.round((link.clicks / views) * 1000) / 10 : 0,
    }));

    return c.json({ success: true, data });
  } catch {
    return c.json({ success: false, error: 'Failed to load link performance' }, 500);
  }
});

/**
 * GET /api/analytics/realtime — events in last 30 minutes
 */
analyticsRoutes.get('/realtime', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyMinAgo = Math.floor(Date.now() / 1000) - 30 * 60;

    const [views, clicks] = await Promise.all([
      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'page_view' AND timestamp > ?`
      ).bind(pageId, thirtyMinAgo).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'link_click' AND timestamp > ?`
      ).bind(pageId, thirtyMinAgo).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        active_views: views?.count ?? 0,
        active_clicks: clicks?.count ?? 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load realtime data' }, 500);
  }
});

/**
 * Block event type labels for the analytics dashboard
 */
const BLOCK_EVENT_LABELS: Record<string, string> = {
  rich_link_click: 'Clicks',
  faq_expand: 'Expansions',
  embed_interact: 'Interactions',
  social_post_click: 'Clicks',
  gallery_view: 'Views',
  collab_click: 'Clicks',
  schedule_click: 'Interactions',
  file_download: 'Downloads',
  poll_vote: 'Votes',
  newsletter_signup: 'Signups',
  social_click: 'Clicks',
  event_ticket_click: 'Ticket Clicks',
  event_expand: 'Detail Expansions',
  event_link_click: 'Link Clicks',
  event_calendar_add: 'Calendar Adds',
  testimonial_navigate: 'Navigations',
  countdown_view: 'Views',
  stats_view: 'Views',
  quote_view: 'Views',
  microblog_expand: 'Expansions',
  booking_click: 'Clicks',
  tip_click: 'Clicks',
};

/**
 * GET /api/analytics/block-performance — interactions per content block + social clicks
 */
analyticsRoutes.get('/block-performance', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

    // Get all block-related events grouped by link_id (which stores block_id) and event_type
    const events = await c.env.DB.prepare(
      `SELECT link_id as block_id, event_type, COUNT(*) as count
       FROM analytics_events
       WHERE page_id = ? AND event_type NOT IN ('page_view', 'link_click') AND link_id IS NOT NULL AND timestamp > ?
       GROUP BY link_id, event_type
       ORDER BY count DESC`
    ).bind(pageId, thirtyDaysAgo).all();

    // Get content block metadata for labels
    const blocks = await c.env.DB.prepare(
      'SELECT id, block_type, title FROM content_blocks WHERE page_id = ?'
    ).bind(pageId).all();

    const blockMap = new Map(
      (blocks.results as { id: string; block_type: string; title: string | null }[])
        .map((b) => [b.id, b])
    );

    // Get social link metadata
    const socials = await c.env.DB.prepare(
      'SELECT id, platform FROM social_links WHERE page_id = ?'
    ).bind(pageId).all();

    const socialMap = new Map(
      (socials.results as { id: string; platform: string }[])
        .map((s) => [s.id, s])
    );

    // Get poll details for poll blocks (vote breakdown)
    const pollBlocks = (blocks.results as { id: string; block_type: string; title: string | null }[])
      .filter((b) => b.block_type === 'poll');
    const pollDetails: Record<string, { question: string; options: { text: string; votes: number }[]; closed: boolean; total_votes: number }> = {};

    for (const pb of pollBlocks) {
      const fullBlock = await c.env.DB.prepare(
        'SELECT data FROM content_blocks WHERE id = ?'
      ).bind(pb.id).first<{ data: string }>();
      if (fullBlock) {
        const pollData = JSON.parse(fullBlock.data);
        const totalVotes = (pollData.options || []).reduce((s: number, o: { votes: number }) => s + (o.votes || 0), 0);
        pollDetails[pb.id] = {
          question: pollData.question || '',
          options: (pollData.options || []).map((o: { text: string; votes: number }) => ({ text: o.text, votes: o.votes || 0 })),
          closed: !!pollData.closed,
          total_votes: totalVotes,
        };
      }
    }

    // Get newsletter subscriber counts
    const newsletterBlocks = (blocks.results as { id: string; block_type: string; title: string | null }[])
      .filter((b) => b.block_type === 'newsletter');
    const newsletterCounts: Record<string, number> = {};

    for (const nb of newsletterBlocks) {
      const count = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM newsletter_signups WHERE block_id = ?'
      ).bind(nb.id).first<{ count: number }>();
      newsletterCounts[nb.id] = count?.count ?? 0;
    }

    const data = (events.results as { block_id: string; event_type: string; count: number }[]).map((row) => {
      const blockMeta = blockMap.get(row.block_id);
      const socialMeta = socialMap.get(row.block_id);
      return {
        block_id: row.block_id,
        block_type: blockMeta?.block_type ?? (socialMeta ? 'social' : 'unknown'),
        title: blockMeta?.title ?? (socialMeta ? socialMeta.platform : null),
        event_type: row.event_type,
        metric_label: BLOCK_EVENT_LABELS[row.event_type] ?? 'Events',
        count: row.count,
        poll: pollDetails[row.block_id] ?? null,
        newsletter_count: newsletterCounts[row.block_id] ?? null,
      };
    });

    // Compute summary from results
    const totalInteractions = data.reduce((s, d) => s + d.count, 0);
    let topBlock: { block_id: string; title: string | null; block_type: string; count: number } | null = null;

    // Group by block_id to find top block by total count
    const blockTotals = new Map<string, { block_id: string; title: string | null; block_type: string; count: number }>();
    for (const d of data) {
      const existing = blockTotals.get(d.block_id);
      if (existing) {
        existing.count += d.count;
      } else {
        blockTotals.set(d.block_id, { block_id: d.block_id, title: d.title, block_type: d.block_type, count: d.count });
      }
    }
    for (const entry of blockTotals.values()) {
      if (!topBlock || entry.count > topBlock.count) {
        topBlock = entry;
      }
    }

    return c.json({
      success: true,
      data,
      summary: {
        total_interactions: totalInteractions,
        top_block: topBlock,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load block performance' }, 500);
  }
});

/**
 * GET /api/analytics/booking-summary — booking_click + schedule_click counts (last 30 days)
 */
analyticsRoutes.get('/booking-summary', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

    const [bookingClicks, scheduleClicks] = await Promise.all([
      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'booking_click' AND timestamp > ?`
      ).bind(pageId, thirtyDaysAgo).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM analytics_events
         WHERE page_id = ? AND event_type = 'schedule_click' AND timestamp > ?`
      ).bind(pageId, thirtyDaysAgo).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        booking_clicks: bookingClicks?.count ?? 0,
        schedule_clicks: scheduleClicks?.count ?? 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load booking summary' }, 500);
  }
});

/**
 * GET /api/analytics/newsletter-signups-by-day?block_id=xxx&days=30
 */
analyticsRoutes.get('/newsletter-signups-by-day', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const blockId = c.req.query('block_id');
    if (!blockId) return c.json({ success: false, error: 'block_id required' }, 400);

    const daysParam = parseInt(c.req.query('days') ?? '30', 10);
    const days = isNaN(daysParam) || daysParam < 1 ? 30 : Math.min(daysParam, 365);
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    // Verify block belongs to this page
    const block = await c.env.DB.prepare(
      'SELECT id FROM content_blocks WHERE id = ? AND page_id = ?'
    ).bind(blockId, pageId).first();
    if (!block) return c.json({ success: false, error: 'Block not found' }, 404);

    const result = await c.env.DB.prepare(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM newsletter_signups
       WHERE block_id = ? AND (
         CASE
           WHEN typeof(created_at) = 'integer' THEN created_at > ?
           ELSE datetime(created_at) > datetime(?, 'unixepoch')
         END
       )
       GROUP BY day
       ORDER BY day ASC`
    ).bind(blockId, since, since).all();

    return c.json({ success: true, data: result.results });
  } catch {
    return c.json({ success: false, error: 'Failed to load newsletter signups by day' }, 500);
  }
});

/**
 * GET /api/analytics/newsletter-subscribers?block_id=xxx — list subscribers for a newsletter block
 */
analyticsRoutes.get('/newsletter-subscribers', async (c) => {
  try {
    const pageId = await getPageId(c);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const blockId = c.req.query('block_id');
    if (!blockId) return c.json({ success: false, error: 'block_id required' }, 400);

    // Verify block belongs to this page
    const block = await c.env.DB.prepare(
      'SELECT id FROM content_blocks WHERE id = ? AND page_id = ?'
    ).bind(blockId, pageId).first();
    if (!block) return c.json({ success: false, error: 'Block not found' }, 404);

    const subscribers = await c.env.DB.prepare(
      'SELECT email, created_at FROM newsletter_signups WHERE block_id = ? ORDER BY created_at DESC'
    ).bind(blockId).all();

    return c.json({ success: true, data: subscribers.results });
  } catch {
    return c.json({ success: false, error: 'Failed to load subscribers' }, 500);
  }
});
