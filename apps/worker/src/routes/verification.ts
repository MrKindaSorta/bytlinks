import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const verificationRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

verificationRoutes.use('*', authMiddleware);

/** GET /api/verification/status — check verified status, eligibility, pending request */
verificationRoutes.get('/status', async (c) => {
  const user = c.get('user');

  try {
    const [dbUser, linkCount, pendingReq] = await Promise.all([
      c.env.DB.prepare(
        'SELECT verified, verified_at, created_at FROM users WHERE id = ?'
      ).bind(user.id).first<{ verified: number; verified_at: number | null; created_at: number }>(),

      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM links WHERE page_id IN (SELECT id FROM bio_pages WHERE user_id = ?)'
      ).bind(user.id).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT id, status, created_at FROM verification_requests
         WHERE user_id = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`
      ).bind(user.id).first<{ id: string; status: string; created_at: number }>(),
    ]);

    if (!dbUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const accountAgeDays = Math.floor((now - dbUser.created_at) / 86400);
    const links = linkCount?.count ?? 0;

    return c.json({
      success: true,
      data: {
        verified: !!dbUser.verified,
        verified_at: dbUser.verified_at,
        eligible: accountAgeDays >= 14 && links >= 3,
        criteria: {
          account_age_days: accountAgeDays,
          account_age_required: 14,
          link_count: links,
          links_required: 3,
        },
        pending_request: pendingReq ?? null,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to check verification status' }, 500);
  }
});

/** POST /api/verification/request — submit a verification request */
verificationRoutes.post('/request', async (c) => {
  const user = c.get('user');

  try {
    // Check eligibility
    const [dbUser, linkCount, existingReq] = await Promise.all([
      c.env.DB.prepare(
        'SELECT verified, created_at FROM users WHERE id = ?'
      ).bind(user.id).first<{ verified: number; created_at: number }>(),

      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM links WHERE page_id IN (SELECT id FROM bio_pages WHERE user_id = ?)'
      ).bind(user.id).first<{ count: number }>(),

      c.env.DB.prepare(
        `SELECT id FROM verification_requests WHERE user_id = ? AND status = 'pending'`
      ).bind(user.id).first(),
    ]);

    if (!dbUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    if (dbUser.verified) {
      return c.json({ success: false, error: 'Already verified' }, 400);
    }

    if (existingReq) {
      return c.json({ success: false, error: 'You already have a pending verification request' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const accountAgeDays = Math.floor((now - dbUser.created_at) / 86400);
    const links = linkCount?.count ?? 0;

    if (accountAgeDays < 14 || links < 3) {
      return c.json({ success: false, error: 'You do not meet the eligibility requirements' }, 403);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO verification_requests (id, user_id) VALUES (?, ?)'
    ).bind(id, user.id).run();

    return c.json({ success: true, data: { id, status: 'pending' } }, 201);
  } catch {
    return c.json({ success: false, error: 'Failed to submit verification request' }, 500);
  }
});
