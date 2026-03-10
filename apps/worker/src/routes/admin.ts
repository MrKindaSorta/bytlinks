import { Hono } from 'hono';
import type { Env } from '../index';

export const adminRoutes = new Hono<{ Bindings: Env }>();

/** Middleware: check X-Admin-Secret header against ADMIN_SECRET env var */
adminRoutes.use('*', async (c, next) => {
  const secret = c.req.header('X-Admin-Secret');
  if (!secret || secret !== c.env.ADMIN_SECRET) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  await next();
});

/** PUT /api/admin/users/:id/verify — mark a user as verified */
adminRoutes.put('/users/:id/verify', async (c) => {
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

/** PUT /api/admin/users/:id/unverify — remove verified status */
adminRoutes.put('/users/:id/unverify', async (c) => {
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
