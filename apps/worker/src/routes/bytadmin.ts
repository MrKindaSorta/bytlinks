import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import type { Env } from '../index';
import { createJwt, verifyJwt, timingSafeCompare } from '../utils/crypto';
import { checkRateLimit } from '../utils/rateLimit';

export const bytadminRoutes = new Hono<{ Bindings: Env }>();

const ADMIN_COOKIE = 'admin_token';
const ADMIN_COOKIE_OPTIONS = 'HttpOnly; Secure; SameSite=Strict; Path=/api/bytadmin; Max-Age=14400';

/** Extract admin_token from cookie header */
function getAdminToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : null;
}

/** Shared helper: parse ?days=N param, clamped 1-365, default 30 */
function getTimeRange(c: Context<{ Bindings: Env }>): number {
  const days = Math.min(Math.max(parseInt(c.req.query('days') || '30', 10), 1), 365);
  return Math.floor(Date.now() / 1000) - days * 86400;
}

/** Admin JWT middleware — verifies admin_token cookie, rejects non-admin JWTs */
async function adminAuth(
  c: Context<{ Bindings: Env }>,
  next: Next,
) {
  const cookieHeader = c.req.header('cookie');
  if (!cookieHeader) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const token = getAdminToken(cookieHeader);
  if (!token) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload || payload.sub !== 'admin') {
    return c.json({ success: false, error: 'Invalid or expired admin session' }, 401);
  }

  await next();
}

// ── Public: Login / Logout ──

bytadminRoutes.post('/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 3 attempts per 30 minutes per IP
  const allowed = await checkRateLimit(c.env.DB, `bytadmin:${ip}`, 3, 1800);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many attempts. Try again later.' }, 429);
  }

  const body = await c.req.json<{ secret?: string }>();
  if (!body.secret || !timingSafeCompare(body.secret, c.env.ADMIN_SECRET)) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const token = await createJwt(
    { sub: 'admin', email: 'admin', plan: 'admin' },
    c.env.JWT_SECRET,
    4 * 60 * 60, // 4 hours
  );

  c.header('Set-Cookie', `${ADMIN_COOKIE}=${token}; ${ADMIN_COOKIE_OPTIONS}`);
  return c.json({ success: true });
});

bytadminRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api/bytadmin; Max-Age=0`);
  return c.json({ success: true });
});

bytadminRoutes.get('/me', adminAuth, (c) => {
  return c.json({ success: true });
});

// ── Protected endpoints ──

bytadminRoutes.get('/overview', adminAuth, async (c) => {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 86400;
  const sixtyDaysAgo = now - 60 * 86400;

  try {
    const [
      totalUsers,
      newUsers,
      prevPeriodUsers,
      totalPages,
      publishedPages,
      totalLinks,
      totalBlocks,
      totalViews,
      recentViews,
      prevPeriodViews,
      totalClicks,
      recentClicks,
      prevPeriodClicks,
      totalNewsletterSignups,
      pendingVerifications,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?').bind(thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?').bind(sixtyDaysAgo, thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM bio_pages').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM bio_pages WHERE is_published = 1').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM links').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM content_blocks').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp > ?").bind(thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp BETWEEN ? AND ?").bind(sixtyDaysAgo, thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click' AND timestamp > ?").bind(thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click' AND timestamp BETWEEN ? AND ?").bind(sixtyDaysAgo, thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM newsletter_signups').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM verification_requests WHERE status = 'pending'").first<{ count: number }>(),
    ]);

    const totalUsersCount = totalUsers?.count ?? 0;
    const publishedCount = publishedPages?.count ?? 0;
    const totalViewsCount = totalViews?.count ?? 0;
    const totalClicksCount = totalClicks?.count ?? 0;

    return c.json({
      success: true,
      data: {
        total_users: totalUsersCount,
        new_users_30d: newUsers?.count ?? 0,
        prev_users_30d: prevPeriodUsers?.count ?? 0,
        total_pages: totalPages?.count ?? 0,
        published_pages: publishedCount,
        total_links: totalLinks?.count ?? 0,
        total_blocks: totalBlocks?.count ?? 0,
        total_views: totalViewsCount,
        recent_views_30d: recentViews?.count ?? 0,
        prev_views_30d: prevPeriodViews?.count ?? 0,
        total_clicks: totalClicksCount,
        recent_clicks_30d: recentClicks?.count ?? 0,
        prev_clicks_30d: prevPeriodClicks?.count ?? 0,
        total_newsletter_signups: totalNewsletterSignups?.count ?? 0,
        pending_verifications: pendingVerifications?.count ?? 0,
        signup_to_publish_rate: totalUsersCount > 0 ? Math.round((publishedCount / totalUsersCount) * 1000) / 10 : 0,
        platform_ctr: totalViewsCount > 0 ? Math.round((totalClicksCount / totalViewsCount) * 1000) / 10 : 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load overview' }, 500);
  }
});

bytadminRoutes.get('/user-growth', adminAuth, async (c) => {
  const days = Math.min(parseInt(c.req.query('days') || '90', 10), 365);
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT DATE(created_at, 'unixepoch') as day, COUNT(*) as count FROM users WHERE created_at > ? GROUP BY day ORDER BY day"
    ).bind(since).all<{ day: string; count: number }>();

    // Compute cumulative totals
    const usersBeforePeriod = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE created_at <= ?'
    ).bind(since).first<{ count: number }>();

    let cumulative = usersBeforePeriod?.count ?? 0;
    const data = (results || []).map((d) => {
      cumulative += d.count;
      return { ...d, cumulative };
    });

    return c.json({ success: true, data });
  } catch {
    return c.json({ success: false, error: 'Failed to load user growth' }, 500);
  }
});

bytadminRoutes.get('/platform-views', adminAuth, async (c) => {
  const since = getTimeRange(c);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT DATE(timestamp, 'unixepoch') as day,
              SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as views,
              SUM(CASE WHEN event_type = 'link_click' THEN 1 ELSE 0 END) as clicks
       FROM analytics_events WHERE timestamp > ?
       GROUP BY day ORDER BY day`
    ).bind(since).all<{ day: string; views: number; clicks: number }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load platform views' }, 500);
  }
});

bytadminRoutes.get('/users', adminAuth, async (c) => {
  const page = Math.max(parseInt(c.req.query('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  const search = c.req.query('search') || '';
  const sort = c.req.query('sort') || 'created_at';
  const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  // Whitelist sortable columns
  const allowedSorts: Record<string, string> = {
    created_at: 'u.created_at',
    email: 'u.email',
    username: 'bp.username',
    view_count: 'view_count',
  };
  const sortCol = allowedSorts[sort] || 'u.created_at';
  const searchParam = search ? `%${search}%` : '';

  try {
    const [countResult, { results }] = await Promise.all([
      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM users u
         LEFT JOIN bio_pages bp ON bp.user_id = u.id
         WHERE (? = '' OR u.email LIKE ? OR bp.username LIKE ?)`
      ).bind(search, searchParam, searchParam).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT u.id, u.email, u.plan, u.verified, u.created_at,
                bp.username, bp.display_name, bp.is_published,
                (SELECT COUNT(*) FROM links WHERE page_id = bp.id) as link_count,
                (SELECT COUNT(*) FROM content_blocks WHERE page_id = bp.id) as block_count,
                (SELECT COUNT(*) FROM analytics_events WHERE page_id = bp.id AND event_type = 'page_view') as view_count
         FROM users u
         LEFT JOIN bio_pages bp ON bp.user_id = u.id
         WHERE (? = '' OR u.email LIKE ? OR bp.username LIKE ?)
         ORDER BY ${sortCol} ${order}
         LIMIT ? OFFSET ?`
      ).bind(search, searchParam, searchParam, limit, offset).all<{
        id: string; email: string; plan: string; verified: number; created_at: number;
        username: string | null; display_name: string | null; is_published: number;
        link_count: number; block_count: number; view_count: number;
      }>(),
    ]);

    return c.json({
      success: true,
      data: results || [],
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        pages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load users' }, 500);
  }
});

bytadminRoutes.get('/top-pages', adminAuth, async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const since = getTimeRange(c);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT bp.username, bp.display_name, u.email, COUNT(*) as views
       FROM analytics_events ae
       JOIN bio_pages bp ON bp.id = ae.page_id
       JOIN users u ON u.id = bp.user_id
       WHERE ae.event_type = 'page_view' AND ae.timestamp > ?
       GROUP BY ae.page_id
       ORDER BY views DESC
       LIMIT ?`
    ).bind(since, limit).all<{ username: string; display_name: string | null; email: string; views: number }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load top pages' }, 500);
  }
});

bytadminRoutes.get('/content-stats', adminAuth, async (c) => {
  try {
    const [blockTypes, avgLinks, avgBlocks, planDist] = await Promise.all([
      c.env.DB.prepare(
        'SELECT block_type, COUNT(*) as count FROM content_blocks GROUP BY block_type ORDER BY count DESC'
      ).all<{ block_type: string; count: number }>(),
      c.env.DB.prepare(
        'SELECT AVG(cnt) as avg FROM (SELECT COUNT(*) as cnt FROM links GROUP BY page_id)'
      ).first<{ avg: number }>(),
      c.env.DB.prepare(
        'SELECT AVG(cnt) as avg FROM (SELECT COUNT(*) as cnt FROM content_blocks GROUP BY page_id)'
      ).first<{ avg: number }>(),
      c.env.DB.prepare(
        'SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC'
      ).all<{ plan: string; count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        block_types: blockTypes.results || [],
        avg_links_per_page: Math.round((avgLinks?.avg ?? 0) * 10) / 10,
        avg_blocks_per_page: Math.round((avgBlocks?.avg ?? 0) * 10) / 10,
        plan_distribution: planDist.results || [],
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load content stats' }, 500);
  }
});

// Bug 1 fix: query `referrer` column (not `referrer_source`), extract domains in JS
bytadminRoutes.get('/referrers', adminAuth, async (c) => {
  const since = getTimeRange(c);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT referrer, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'page_view' AND timestamp > ? AND referrer IS NOT NULL AND referrer != ''
       GROUP BY referrer
       ORDER BY count DESC
       LIMIT 50`
    ).bind(since).all<{ referrer: string; count: number }>();

    // Extract domain from full URL and merge duplicates
    const merged = new Map<string, number>();
    for (const r of results || []) {
      let source: string;
      try {
        source = new URL(r.referrer).hostname.replace(/^www\./, '');
      } catch {
        source = r.referrer;
      }
      merged.set(source, (merged.get(source) ?? 0) + r.count);
    }

    const data = Array.from(merged.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return c.json({ success: true, data });
  } catch {
    return c.json({ success: false, error: 'Failed to load referrers' }, 500);
  }
});

bytadminRoutes.get('/countries', adminAuth, async (c) => {
  const since = getTimeRange(c);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT country, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'page_view' AND timestamp > ? AND country IS NOT NULL AND country != ''
       GROUP BY country
       ORDER BY count DESC
       LIMIT 20`
    ).bind(since).all<{ country: string; count: number }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load countries' }, 500);
  }
});

bytadminRoutes.get('/devices', adminAuth, async (c) => {
  const since = getTimeRange(c);

  try {
    const [deviceTypes, browsers, operatingSystems] = await Promise.all([
      c.env.DB.prepare(
        `SELECT device_type as name, COUNT(*) as count
         FROM analytics_events
         WHERE event_type = 'page_view' AND timestamp > ? AND device_type IS NOT NULL
         GROUP BY device_type ORDER BY count DESC`
      ).bind(since).all<{ name: string; count: number }>(),
      c.env.DB.prepare(
        `SELECT browser as name, COUNT(*) as count
         FROM analytics_events
         WHERE event_type = 'page_view' AND timestamp > ? AND browser IS NOT NULL
         GROUP BY browser ORDER BY count DESC LIMIT 10`
      ).bind(since).all<{ name: string; count: number }>(),
      c.env.DB.prepare(
        `SELECT os as name, COUNT(*) as count
         FROM analytics_events
         WHERE event_type = 'page_view' AND timestamp > ? AND os IS NOT NULL
         GROUP BY os ORDER BY count DESC LIMIT 10`
      ).bind(since).all<{ name: string; count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        device_types: deviceTypes.results || [],
        browsers: browsers.results || [],
        operating_systems: operatingSystems.results || [],
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load devices' }, 500);
  }
});

bytadminRoutes.get('/activity-feed', adminAuth, async (c) => {
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

  try {
    const [recentSignups, activePagesResult] = await Promise.all([
      c.env.DB.prepare(
        `SELECT u.id, u.email, u.created_at, bp.username
         FROM users u
         LEFT JOIN bio_pages bp ON bp.user_id = u.id
         ORDER BY u.created_at DESC LIMIT 20`
      ).all<{ id: string; email: string; created_at: number; username: string | null }>(),

      c.env.DB.prepare(
        `SELECT bp.username, bp.display_name, COUNT(*) as views
         FROM analytics_events ae
         JOIN bio_pages bp ON bp.id = ae.page_id
         WHERE ae.event_type = 'page_view' AND ae.timestamp > ?
         GROUP BY ae.page_id
         ORDER BY views DESC LIMIT 20`
      ).bind(oneDayAgo).all<{ username: string; display_name: string | null; views: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        recent_signups: recentSignups.results || [],
        active_pages: activePagesResult.results || [],
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load activity feed' }, 500);
  }
});

// Bug 2 fix: removed vr.full_name and vr.links (don't exist in schema)
bytadminRoutes.get('/verification-queue', adminAuth, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT vr.id, vr.user_id, vr.reason, vr.created_at, vr.status,
              u.email, bp.username, bp.display_name
       FROM verification_requests vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN bio_pages bp ON bp.user_id = vr.user_id
       WHERE vr.status = 'pending'
       ORDER BY vr.created_at ASC`
    ).all<{
      id: string; user_id: string; reason: string;
      created_at: number; status: string; email: string; username: string | null; display_name: string | null;
    }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load verification queue' }, 500);
  }
});

// ── New endpoints ──

bytadminRoutes.get('/activation-funnel', adminAuth, async (c) => {
  try {
    const [signedUp, createdPage, published, addedLinks, addedBlocks, gotViews, gotClicks] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(DISTINCT user_id) as count FROM bio_pages').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(DISTINCT user_id) as count FROM bio_pages WHERE is_published = 1').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(DISTINCT bp.user_id) as count FROM bio_pages bp WHERE EXISTS (SELECT 1 FROM links WHERE page_id = bp.id)').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(DISTINCT bp.user_id) as count FROM bio_pages bp WHERE EXISTS (SELECT 1 FROM content_blocks WHERE page_id = bp.id)').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(DISTINCT ae.page_id) as count FROM analytics_events ae WHERE event_type = 'page_view'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(DISTINCT ae.page_id) as count FROM analytics_events ae WHERE event_type = 'link_click'").first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        signed_up: signedUp?.count ?? 0,
        created_page: createdPage?.count ?? 0,
        published: published?.count ?? 0,
        added_links: addedLinks?.count ?? 0,
        added_blocks: addedBlocks?.count ?? 0,
        got_views: gotViews?.count ?? 0,
        got_clicks: gotClicks?.count ?? 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load activation funnel' }, 500);
  }
});

bytadminRoutes.get('/engagement-metrics', adminAuth, async (c) => {
  const since = getTimeRange(c);
  const now = Math.floor(Date.now() / 1000);
  const staleThreshold = now - 30 * 86400;

  try {
    const [activePages, totalInteractions, interactionBreakdown, stalePages, recentlyUpdated] = await Promise.all([
      c.env.DB.prepare(
        "SELECT COUNT(DISTINCT page_id) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp > ?"
      ).bind(since).first<{ count: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM analytics_events WHERE event_type != 'page_view' AND timestamp > ?"
      ).bind(since).first<{ count: number }>(),
      c.env.DB.prepare(
        `SELECT event_type, COUNT(*) as count FROM analytics_events
         WHERE event_type NOT IN ('page_view','link_click') AND timestamp > ?
         GROUP BY event_type ORDER BY count DESC`
      ).bind(since).all<{ event_type: string; count: number }>(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM bio_pages WHERE is_published = 1 AND updated_at < ?'
      ).bind(staleThreshold).first<{ count: number }>(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM bio_pages WHERE is_published = 1 AND updated_at > ?'
      ).bind(staleThreshold).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        active_pages: activePages?.count ?? 0,
        total_interactions: totalInteractions?.count ?? 0,
        interaction_breakdown: interactionBreakdown.results || [],
        stale_pages: stalePages?.count ?? 0,
        recently_updated: recentlyUpdated?.count ?? 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load engagement metrics' }, 500);
  }
});

bytadminRoutes.get('/hourly-heatmap', adminAuth, async (c) => {
  const since = getTimeRange(c);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT CAST(strftime('%w', timestamp, 'unixepoch') AS INTEGER) as dow,
              CAST(strftime('%H', timestamp, 'unixepoch') AS INTEGER) as hour,
              COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'page_view' AND timestamp > ?
       GROUP BY dow, hour`
    ).bind(since).all<{ dow: number; hour: number; count: number }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load hourly heatmap' }, 500);
  }
});

bytadminRoutes.get('/growth-rates', adminAuth, async (c) => {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 86400;
  const twoWeeksAgo = now - 14 * 86400;
  const oneMonthAgo = now - 30 * 86400;
  const twoMonthsAgo = now - 60 * 86400;

  try {
    const [
      usersThisWeek, usersLastWeek,
      viewsThisWeek, viewsLastWeek,
      clicksThisWeek, clicksLastWeek,
      usersThisMonth, usersLastMonth,
      viewsThisMonth, viewsLastMonth,
      clicksThisMonth, clicksLastMonth,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?').bind(oneWeekAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?').bind(twoWeeksAgo, oneWeekAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp > ?").bind(oneWeekAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp BETWEEN ? AND ?").bind(twoWeeksAgo, oneWeekAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click' AND timestamp > ?").bind(oneWeekAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click' AND timestamp BETWEEN ? AND ?").bind(twoWeeksAgo, oneWeekAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?').bind(oneMonthAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?').bind(twoMonthsAgo, oneMonthAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp > ?").bind(oneMonthAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp BETWEEN ? AND ?").bind(twoMonthsAgo, oneMonthAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click' AND timestamp > ?").bind(oneMonthAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click' AND timestamp BETWEEN ? AND ?").bind(twoMonthsAgo, oneMonthAgo).first<{ count: number }>(),
    ]);

    function changePct(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    const uw = usersThisWeek?.count ?? 0, ul = usersLastWeek?.count ?? 0;
    const vw = viewsThisWeek?.count ?? 0, vl = viewsLastWeek?.count ?? 0;
    const cw = clicksThisWeek?.count ?? 0, cl = clicksLastWeek?.count ?? 0;
    const um = usersThisMonth?.count ?? 0, ulm = usersLastMonth?.count ?? 0;
    const vm = viewsThisMonth?.count ?? 0, vlm = viewsLastMonth?.count ?? 0;
    const cm = clicksThisMonth?.count ?? 0, clm = clicksLastMonth?.count ?? 0;

    return c.json({
      success: true,
      data: {
        weekly: {
          users: { current: uw, previous: ul, change_pct: changePct(uw, ul) },
          views: { current: vw, previous: vl, change_pct: changePct(vw, vl) },
          clicks: { current: cw, previous: cl, change_pct: changePct(cw, cl) },
        },
        monthly: {
          users: { current: um, previous: ulm, change_pct: changePct(um, ulm) },
          views: { current: vm, previous: vlm, change_pct: changePct(vm, vlm) },
          clicks: { current: cm, previous: clm, change_pct: changePct(cm, clm) },
        },
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load growth rates' }, 500);
  }
});

bytadminRoutes.get('/export', adminAuth, async (c) => {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 86400;

  try {
    const [overview, growth, views, pages, referrers, countries, devices, content, funnel] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      c.env.DB.prepare(
        "SELECT DATE(created_at, 'unixepoch') as day, COUNT(*) as count FROM users WHERE created_at > ? GROUP BY day ORDER BY day"
      ).bind(thirtyDaysAgo).all<{ day: string; count: number }>(),
      c.env.DB.prepare(
        `SELECT DATE(timestamp, 'unixepoch') as day,
                SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN event_type = 'link_click' THEN 1 ELSE 0 END) as clicks
         FROM analytics_events WHERE timestamp > ? GROUP BY day ORDER BY day`
      ).bind(thirtyDaysAgo).all(),
      c.env.DB.prepare(
        `SELECT bp.username, COUNT(*) as views FROM analytics_events ae
         JOIN bio_pages bp ON bp.id = ae.page_id
         WHERE ae.event_type = 'page_view' AND ae.timestamp > ?
         GROUP BY ae.page_id ORDER BY views DESC LIMIT 20`
      ).bind(thirtyDaysAgo).all(),
      c.env.DB.prepare(
        `SELECT referrer, COUNT(*) as count FROM analytics_events
         WHERE event_type = 'page_view' AND timestamp > ? AND referrer IS NOT NULL AND referrer != ''
         GROUP BY referrer ORDER BY count DESC LIMIT 50`
      ).bind(thirtyDaysAgo).all(),
      c.env.DB.prepare(
        `SELECT country, COUNT(*) as count FROM analytics_events
         WHERE event_type = 'page_view' AND timestamp > ? AND country IS NOT NULL AND country != ''
         GROUP BY country ORDER BY count DESC LIMIT 20`
      ).bind(thirtyDaysAgo).all(),
      c.env.DB.prepare(
        `SELECT device_type as name, COUNT(*) as count FROM analytics_events
         WHERE event_type = 'page_view' AND timestamp > ? AND device_type IS NOT NULL
         GROUP BY device_type ORDER BY count DESC`
      ).bind(thirtyDaysAgo).all(),
      c.env.DB.prepare(
        'SELECT block_type, COUNT(*) as count FROM content_blocks GROUP BY block_type ORDER BY count DESC'
      ).all(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    const exportData = {
      exported_at: new Date().toISOString(),
      period: '30d',
      total_users: overview?.count ?? 0,
      user_growth: growth.results || [],
      platform_views: views.results || [],
      top_pages: pages.results || [],
      referrers: referrers.results || [],
      countries: countries.results || [],
      devices: devices.results || [],
      content_blocks: content.results || [],
      total_users_snapshot: funnel?.count ?? 0,
    };

    c.header('Content-Disposition', `attachment; filename=bytlinks-admin-${dateStr}.json`);
    c.header('Content-Type', 'application/json');
    return c.json({ success: true, data: exportData });
  } catch {
    return c.json({ success: false, error: 'Failed to export data' }, 500);
  }
});

// ── Verify / Unverify ──

bytadminRoutes.put('/users/:id/verify', adminAuth, async (c) => {
  const userId = c.req.param('id');
  const now = Math.floor(Date.now() / 1000);

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        'UPDATE users SET verified = 1, verified_at = ? WHERE id = ?'
      ).bind(now, userId),
      c.env.DB.prepare(
        `UPDATE verification_requests SET status = 'approved', reviewed_at = ?
         WHERE user_id = ? AND status = 'pending'`
      ).bind(now, userId),
    ]);

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to verify user' }, 500);
  }
});

bytadminRoutes.put('/users/:id/unverify', adminAuth, async (c) => {
  const userId = c.req.param('id');

  try {
    await c.env.DB.prepare(
      'UPDATE users SET verified = 0, verified_at = NULL WHERE id = ?'
    ).bind(userId).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to unverify user' }, 500);
  }
});
