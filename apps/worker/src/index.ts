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

export type Env = {
  DB: D1Database;
  STORAGE: R2Bucket;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({
  origin: (origin, c) => {
    if (c.env.ENVIRONMENT === 'development') {
      return origin; // Allow any origin in dev
    }
    return origin; // Same-origin in production, CORS headers harmless
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

export default app;
