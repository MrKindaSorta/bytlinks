import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { pageRoutes } from './routes/pages';
import { linkRoutes } from './routes/links';
import { analyticsRoutes } from './routes/analytics';
import { publicRoutes } from './routes/public';
import { socialRoutes } from './routes/socials';
import { billingRoutes } from './routes/billing';
import { blockRoutes } from './routes/blocks';
import { adminRoutes } from './routes/admin';
import { verificationRoutes } from './routes/verification';
import { importRoutes } from './routes/import';
import { exportRoutes } from './routes/export';
import { utilRoutes, eventRsvpRoutes } from './routes/utils';
import { rolodexRoutes } from './routes/rolodex';
import { seoRoutes } from './routes/seo';
import { buildMetaTags, buildJsonLd } from './utils/injectMeta';
import type { ProfileMetaData, SocialLink } from './utils/injectMeta';

export type Env = {
  DB: D1Database;
  STORAGE: R2Bucket;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ADMIN_SECRET: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  CREDENTIALS_ENCRYPTION_KEY?: string;
};

const ALLOWED_ORIGINS = ['https://www.bytlinks.com', 'https://bytlinks.com'];

const app = new Hono<{ Bindings: Env }>();

// Security headers on all API responses
app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

app.use('/api/*', cors({
  origin: (origin, c) => {
    if (c.env.ENVIRONMENT === 'development') {
      return origin; // Allow any origin in dev
    }
    return ALLOWED_ORIGINS.includes(origin) ? origin : '';
  },
  credentials: true,
}));

app.route('/api/auth', authRoutes);
app.route('/api/pages', pageRoutes);
app.route('/api/links', linkRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/socials', socialRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/blocks', blockRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/verification', verificationRoutes);
app.route('/api/import', importRoutes);
app.route('/api/export', exportRoutes);
app.route('/api/utils', utilRoutes);
app.route('/api/event-rsvps', eventRsvpRoutes);
app.route('/api/rolodex', rolodexRoutes);
app.route('/api/seo', seoRoutes);
app.route('/api/public', publicRoutes);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// ── robots.txt ──
app.get('/robots.txt', (c) => {
  return new Response(
    `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Disallow: /api/
Sitemap: https://www.bytlinks.com/sitemap.xml`,
    {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    },
  );
});

// ── Dynamic sitemap ──
app.get('/sitemap.xml', async (c) => {
  const baseUrl = 'https://www.bytlinks.com';

  try {
    // TODO: When page privacy/visibility feature is implemented,
    // add a WHERE clause here to exclude private/unlisted pages.
    // See: migrations/023_seo_fields.sql for context.
    const { results } = await c.env.DB.prepare(
      'SELECT username, created_at FROM bio_pages WHERE is_published = 1 ORDER BY created_at DESC LIMIT 10000'
    ).all<{ username: string; created_at: number }>();

    const userUrls = (results || []).map((row) => {
      const date = new Date(row.created_at * 1000).toISOString().split('T')[0];
      return `  <url>
    <loc>${baseUrl}/${encodeURIComponent(row.username)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/for/musicians</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/for/freelancers</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/for/businesses</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/for/creators</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/for/podcasters</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/for/coaches</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
${userUrls}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return c.json({ error: 'Failed to generate sitemap' }, 500);
  }
});

// ── SEO: intercept public profile pages for meta injection ──
// Must be BEFORE the SPA fallback so crawlers get populated <head> tags.
const RESERVED_PATHS = new Set([
  'login', 'signup', 'dashboard', 'settings', 'c', 'api', 'for',
  'sitemap.xml', 'robots.txt', 'privacy', 'terms',
]);

app.get('/:username', async (c, next) => {
  const username = c.req.param('username');

  // Skip reserved app routes — let them fall through to SPA
  if (RESERVED_PATHS.has(username)) return next();

  // Only intercept username-shaped paths (lowercase alphanumeric + _ -)
  if (!/^[a-z0-9_-]+$/.test(username)) return next();

  try {
    // TODO: When page privacy/visibility feature is implemented,
    // skip meta injection for private/unlisted pages and fall through to SPA.
    const profile = await c.env.DB.prepare(
      `SELECT id, username, display_name, bio, job_title, company_name,
              avatar_r2_key, seo_title, seo_description, seo_keywords
       FROM bio_pages WHERE username = ? AND is_published = 1`
    ).bind(username).first<ProfileMetaData & { id: string }>();

    // No user found — fall through to SPA (shows React 404)
    if (!profile) return next();

    // Fetch social links for sameAs in JSON-LD
    const socialsResult = await c.env.DB.prepare(
      'SELECT platform, url FROM social_links WHERE page_id = ?'
    ).bind(profile.id).all<SocialLink>();
    const socialLinks = socialsResult.results || [];

    // Fetch the index.html shell
    const url = new URL(c.req.url);
    url.pathname = '/index.html';
    const htmlRes = await c.env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    let html = await htmlRes.text();

    const baseUrl = `${url.protocol}//${url.host}`;
    const metaTags = buildMetaTags(profile, socialLinks, baseUrl);
    const jsonLd = buildJsonLd(profile, socialLinks, baseUrl);

    // Replace the static <title> with populated meta tags + JSON-LD
    html = html.replace(/<title>[^<]*<\/title>/, metaTags + '\n    ' + jsonLd);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
      },
    });
  } catch {
    // On error, fall through to normal SPA behavior
    return next();
  }
});

// SPA fallback — serve static assets, fall back to index.html for client-side routes
app.all('*', async (c) => {
  // With not_found_handling = "single-page-application" in wrangler.toml,
  // ASSETS automatically serves index.html for missing paths.
  // The manual fallback below is kept as a safety net.
  let res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    const url = new URL(c.req.url);
    url.pathname = '/index.html';
    res = await c.env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  }
  // Clone the response so we can add headers (ASSETS responses are immutable)
  const newRes = new Response(res.body, res);
  newRes.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  return newRes;
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Refresh live stats every 6 hours
    const { fetchLiveStat } = await import('./utils/liveStats');
    const { cleanupRateLimits } = await import('./utils/rateLimit');

    // Housekeeping: purge expired rate limit entries
    try { await cleanupRateLimits(env.DB); } catch { /* non-critical */ }

    try {
      const blocks = await env.DB.prepare(
        "SELECT id, data FROM content_blocks WHERE block_type = 'stats'"
      ).all<{ id: string; data: string }>();

      if (!blocks.results?.length) return;

      const envVars = {
        SPOTIFY_CLIENT_ID: env.SPOTIFY_CLIENT_ID,
        SPOTIFY_CLIENT_SECRET: env.SPOTIFY_CLIENT_SECRET,
        YOUTUBE_API_KEY: env.YOUTUBE_API_KEY,
      };

      // Process in batches of 10
      const allTasks: { blockId: string; data: { items: Record<string, unknown>[]; animate?: boolean }; itemIndex: number; source: string; sourceUrl: string }[] = [];

      for (const block of blocks.results) {
        const data = JSON.parse(block.data) as { items: Record<string, unknown>[] };
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          if (item.source && item.source !== 'manual' && item.source_url) {
            allTasks.push({ blockId: block.id, data, itemIndex: i, source: item.source as string, sourceUrl: item.source_url as string });
          }
        }
      }

      for (let i = 0; i < allTasks.length; i += 10) {
        const batch = allTasks.slice(i, i + 10);
        await Promise.allSettled(batch.map(async (task) => {
          const result = await fetchLiveStat(task.source, task.sourceUrl, envVars);
          if ('value' in result) {
            task.data.items[task.itemIndex] = {
              ...task.data.items[task.itemIndex],
              live_value: result.value,
              last_fetched_at: Math.floor(Date.now() / 1000),
            };
            await env.DB.prepare(
              'UPDATE content_blocks SET data = ? WHERE id = ?'
            ).bind(JSON.stringify(task.data), task.blockId).run();
          }
        }));
      }
    } catch {
      // Cron failure is non-critical
    }
  },
};
