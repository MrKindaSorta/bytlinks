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

  try {
    const [
      totalUsers,
      newUsers,
      totalPages,
      publishedPages,
      totalLinks,
      totalBlocks,
      totalViews,
      recentViews,
      totalClicks,
      totalNewsletterSignups,
      pendingVerifications,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?').bind(thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM bio_pages').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM bio_pages WHERE is_published = 1').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM links').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM content_blocks').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' AND timestamp > ?").bind(thirtyDaysAgo).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'link_click'").first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM newsletter_signups').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM verification_requests WHERE status = 'pending'").first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        total_users: totalUsers?.count ?? 0,
        new_users_30d: newUsers?.count ?? 0,
        total_pages: totalPages?.count ?? 0,
        published_pages: publishedPages?.count ?? 0,
        total_links: totalLinks?.count ?? 0,
        total_blocks: totalBlocks?.count ?? 0,
        total_views: totalViews?.count ?? 0,
        recent_views_30d: recentViews?.count ?? 0,
        total_clicks: totalClicks?.count ?? 0,
        total_newsletter_signups: totalNewsletterSignups?.count ?? 0,
        pending_verifications: pendingVerifications?.count ?? 0,
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

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load user growth' }, 500);
  }
});

bytadminRoutes.get('/platform-views', adminAuth, async (c) => {
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

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
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

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

bytadminRoutes.get('/referrers', adminAuth, async (c) => {
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT referrer_source as source, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'page_view' AND timestamp > ? AND referrer_source IS NOT NULL AND referrer_source != ''
       GROUP BY referrer_source
       ORDER BY count DESC
       LIMIT 20`
    ).bind(since).all<{ source: string; count: number }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load referrers' }, 500);
  }
});

bytadminRoutes.get('/countries', adminAuth, async (c) => {
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

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
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

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

bytadminRoutes.get('/verification-queue', adminAuth, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT vr.id, vr.user_id, vr.full_name, vr.reason, vr.links, vr.created_at, vr.status,
              u.email, bp.username, bp.display_name
       FROM verification_requests vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN bio_pages bp ON bp.user_id = vr.user_id
       WHERE vr.status = 'pending'
       ORDER BY vr.created_at ASC`
    ).all<{
      id: string; user_id: string; full_name: string; reason: string; links: string;
      created_at: number; status: string; email: string; username: string | null; display_name: string | null;
    }>();

    return c.json({ success: true, data: results || [] });
  } catch {
    return c.json({ success: false, error: 'Failed to load verification queue' }, 500);
  }
});

// ── Verify / Unverify (migrated from admin.ts) ──

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
