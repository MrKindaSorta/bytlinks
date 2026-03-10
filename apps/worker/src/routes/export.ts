import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const exportRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

exportRoutes.use('*', authMiddleware);

/**
 * GET /api/export/json — full profile export as JSON
 */
exportRoutes.get('/json', async (c) => {
  const user = c.get('user');

  try {
    const data = await gatherExportData(c.env.DB, user.id);
    if (!data) return c.json({ success: false, error: 'No page found' }, 404);

    return c.json({
      success: true,
      data: {
        exported_at: new Date().toISOString(),
        format: 'json',
        ...data,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/**
 * GET /api/export/csv — links + analytics as CSV (zip-style multi-file via JSON wrapper)
 */
exportRoutes.get('/csv', async (c) => {
  const user = c.get('user');

  try {
    const data = await gatherExportData(c.env.DB, user.id);
    if (!data) return c.json({ success: false, error: 'No page found' }, 404);

    return c.json({
      success: true,
      data: {
        exported_at: new Date().toISOString(),
        format: 'csv',
        links: toCsv(data.links, ['title', 'url', 'description', 'is_visible', 'is_featured', 'click_count', 'published_at', 'expires_at', 'created_at']),
        social_links: toCsv(data.social_links, ['platform', 'url', 'icon_style', 'order_num']),
        content_blocks: toCsv(data.content_blocks.map((b) => ({
          ...b,
          data: JSON.stringify(b.data),
        })), ['block_type', 'title', 'data', 'is_visible', 'column_span', 'created_at']),
        analytics: toCsv(data.analytics, ['event_type', 'link_id', 'referrer', 'country', 'city', 'device_type', 'browser', 'os', 'timestamp']),
        newsletter_subscribers: toCsv(data.newsletter_subscribers, ['block_title', 'email', 'subscribed_at']),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/**
 * GET /api/export/links-csv — direct CSV file download for links only
 */
exportRoutes.get('/links-csv', async (c) => {
  const user = c.get('user');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id, username FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string; username: string }>();
    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    const links = await c.env.DB.prepare(
      'SELECT title, url, description, is_visible, is_featured, click_count, published_at, expires_at, created_at FROM links WHERE page_id = ? ORDER BY order_num'
    ).bind(page.id).all();

    const csv = toCsv(links.results as Record<string, unknown>[],
      ['title', 'url', 'description', 'is_visible', 'is_featured', 'click_count', 'published_at', 'expires_at', 'created_at']);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${page.username}-links.csv"`,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/**
 * GET /api/export/analytics-csv — direct CSV file download for analytics
 */
exportRoutes.get('/analytics-csv', async (c) => {
  const user = c.get('user');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id, username FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string; username: string }>();
    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    const events = await c.env.DB.prepare(
      'SELECT event_type, link_id, referrer, country, city, device_type, browser, os, session_id, timestamp FROM analytics_events WHERE page_id = ? ORDER BY timestamp DESC LIMIT 10000'
    ).bind(page.id).all();

    const csv = toCsv(events.results as Record<string, unknown>[],
      ['event_type', 'link_id', 'referrer', 'country', 'city', 'device_type', 'browser', 'os', 'session_id', 'timestamp']);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${page.username}-analytics.csv"`,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/* ── Helpers ── */

interface ExportData {
  account: {
    email: string;
    plan: string;
    verified: boolean;
    created_at: number;
  };
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    about_me: string | null;
    theme: unknown;
    section_order: unknown;
    show_branding: boolean;
    is_published: boolean;
    avatar_url: string | null;
    created_at: number;
  };
  links: Record<string, unknown>[];
  social_links: Record<string, unknown>[];
  content_blocks: (Record<string, unknown> & { data: unknown })[];
  analytics: Record<string, unknown>[];
  newsletter_subscribers: Record<string, unknown>[];
}

async function gatherExportData(db: D1Database, userId: string): Promise<ExportData | null> {
  const [dbUser, page] = await Promise.all([
    db.prepare('SELECT email, plan, verified, created_at FROM users WHERE id = ?')
      .bind(userId).first<{ email: string; plan: string; verified: number; created_at: number }>(),
    db.prepare('SELECT * FROM bio_pages WHERE user_id = ?')
      .bind(userId).first(),
  ]);

  if (!dbUser || !page) return null;

  const pageId = page.id as string;

  // Use individual try/catch so one failing table doesn't break the whole export
  const safeAll = async (sql: string, id: string) => {
    try {
      return (await db.prepare(sql).bind(id).all()).results;
    } catch {
      return [];
    }
  };

  const [linkResults, socialResults, blockResults, eventResults] = await Promise.all([
    safeAll('SELECT title, url, description, icon, is_visible, is_featured, order_num, click_count, style_overrides, published_at, expires_at, created_at FROM links WHERE page_id = ? ORDER BY order_num', pageId),
    safeAll('SELECT platform, url, icon_style, order_num FROM social_links WHERE page_id = ? ORDER BY order_num', pageId),
    safeAll('SELECT block_type, title, data, is_visible, column_span, created_at FROM content_blocks WHERE page_id = ? ORDER BY created_at', pageId),
    safeAll('SELECT event_type, link_id, referrer, country, city, device_type, browser, os, timestamp FROM analytics_events WHERE page_id = ? ORDER BY timestamp DESC LIMIT 10000', pageId),
  ]);

  // Gather newsletter subscribers across all newsletter blocks
  const newsletterBlocks = blockResults.filter((b: Record<string, unknown>) => b.block_type === 'newsletter');
  let subscribers: Record<string, unknown>[] = [];
  if (newsletterBlocks.length > 0) {
    try {
      const nlBlocks = await db.prepare(
        `SELECT id, title FROM content_blocks WHERE page_id = ? AND block_type = 'newsletter'`
      ).bind(pageId).all();

      for (const nlBlock of nlBlocks.results) {
        const subs = await db.prepare(
          'SELECT email, created_at FROM newsletter_signups WHERE block_id = ? ORDER BY created_at'
        ).bind((nlBlock as Record<string, unknown>).id).all();

        for (const sub of subs.results) {
          subscribers.push({
            block_title: (nlBlock as Record<string, unknown>).title || 'Newsletter',
            email: (sub as Record<string, unknown>).email,
            subscribed_at: (sub as Record<string, unknown>).created_at,
          });
        }
      }
    } catch {
      // newsletter_signups table may not exist
    }
  }

  const avatarKey = page.avatar_r2_key as string | null;

  return {
    account: {
      email: dbUser.email,
      plan: dbUser.plan,
      verified: !!dbUser.verified,
      created_at: dbUser.created_at,
    },
    profile: {
      username: page.username as string,
      display_name: page.display_name as string | null,
      bio: page.bio as string | null,
      about_me: page.about_me as string | null,
      theme: page.theme ? JSON.parse(page.theme as string) : null,
      section_order: page.section_order ? JSON.parse(page.section_order as string) : null,
      show_branding: !!(page.show_branding),
      is_published: !!(page.is_published),
      avatar_url: avatarKey ? `/api/public/avatar/${avatarKey}` : null,
      created_at: page.created_at as number,
    },
    links: linkResults.map((l: Record<string, unknown>) => ({
      ...l,
      style_overrides: l.style_overrides ? JSON.parse(l.style_overrides as string) : null,
      is_visible: !!l.is_visible,
      is_featured: !!l.is_featured,
    })),
    social_links: socialResults as Record<string, unknown>[],
    content_blocks: blockResults.map((b: Record<string, unknown>) => ({
      ...b,
      data: b.data ? JSON.parse(b.data as string) : null,
      is_visible: !!b.is_visible,
    })) as (Record<string, unknown> & { data: unknown })[],
    analytics: eventResults as Record<string, unknown>[],
    newsletter_subscribers: subscribers,
  };
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escape(row[col])).join(','));
  return [header, ...lines].join('\n');
}
