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
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
app.route('/api/public', publicRoutes);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// SPA fallback — serve static assets, fall back to index.html for client-side routes
app.all('*', async (c) => {
  // With not_found_handling = "single-page-application" in wrangler.toml,
  // ASSETS automatically serves index.html for missing paths.
  // The manual fallback below is kept as a safety net.
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    const url = new URL(c.req.url);
    url.pathname = '/index.html';
    return c.env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  }
  return res;
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
