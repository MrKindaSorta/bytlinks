import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { createJwt } from '../utils/crypto';

export const billingRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

billingRoutes.use('*', authMiddleware);

const PLANS = {
  free: { name: 'Free', price: 0 },
  pro: { name: 'Pro', price: 9 },
} as const;

/**
 * GET /api/billing/status — current plan info
 */
billingRoutes.get('/status', async (c) => {
  const user = c.get('user');

  try {
    const row = await c.env.DB.prepare(
      'SELECT plan, stripe_customer_id FROM users WHERE id = ?'
    ).bind(user.id).first() as { plan: string; stripe_customer_id: string | null } | null;

    if (!row) return c.json({ success: false, error: 'User not found' }, 404);

    return c.json({
      success: true,
      data: {
        plan: row.plan,
        plan_name: PLANS[row.plan as keyof typeof PLANS]?.name ?? 'Free',
        price: PLANS[row.plan as keyof typeof PLANS]?.price ?? 0,
        has_payment_method: !!row.stripe_customer_id,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load billing' }, 500);
  }
});

/**
 * POST /api/billing/upgrade — mock Stripe: upgrades to Pro
 * In production this would create a Stripe Checkout session.
 * For now it just toggles the plan in D1.
 */
billingRoutes.post('/upgrade', async (c) => {
  const user = c.get('user');

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE users SET plan = 'pro', stripe_customer_id = ? WHERE id = ?"
      ).bind(`mock_cus_${crypto.randomUUID().slice(0, 8)}`, user.id),
      c.env.DB.prepare(
        'UPDATE bio_pages SET show_branding = 0 WHERE user_id = ?'
      ).bind(user.id),
    ]);

    // Issue new JWT with updated plan
    const token = await createJwt(
      { sub: user.id, email: user.email, plan: 'pro' },
      c.env.JWT_SECRET,
    );

    const cookieOpts = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800';
    c.header('Set-Cookie', `token=${token}; ${cookieOpts}`);

    return c.json({ success: true, data: { plan: 'pro' } });
  } catch {
    return c.json({ success: false, error: 'Upgrade failed' }, 500);
  }
});

/**
 * POST /api/billing/downgrade — cancel Pro, revert to Free
 */
billingRoutes.post('/downgrade', async (c) => {
  const user = c.get('user');

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE users SET plan = 'free', stripe_customer_id = NULL WHERE id = ?"
      ).bind(user.id),
      c.env.DB.prepare(
        'UPDATE bio_pages SET show_branding = 1 WHERE user_id = ?'
      ).bind(user.id),
    ]);

    const token = await createJwt(
      { sub: user.id, email: user.email, plan: 'free' },
      c.env.JWT_SECRET,
    );

    const cookieOpts = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800';
    c.header('Set-Cookie', `token=${token}; ${cookieOpts}`);

    return c.json({ success: true, data: { plan: 'free' } });
  } catch {
    return c.json({ success: false, error: 'Downgrade failed' }, 500);
  }
});
