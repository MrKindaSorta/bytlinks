import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { createJwt } from '../utils/crypto';

export const billingRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

const PLANS = {
  free: { name: 'Free', price: 0 },
  pro: { name: 'Pro', price: 9.99 },
} as const;

const STRIPE_API = 'https://api.stripe.com/v1';
const COOKIE_OPTS = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800';

/** Helper to call Stripe REST API from Workers (no Node SDK needed). */
async function stripeRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    ...(body ? { body: new URLSearchParams(body).toString() } : {}),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

// ── Authenticated endpoints ──
const authed = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();
authed.use('*', authMiddleware);

/**
 * GET /api/billing/status — current plan info
 */
authed.get('/status', async (c) => {
  const user = c.get('user');

  try {
    const row = await c.env.DB.prepare(
      'SELECT plan, stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?'
    ).bind(user.id).first<{ plan: string; stripe_customer_id: string | null; stripe_subscription_id: string | null }>();

    if (!row) return c.json({ success: false, error: 'User not found' }, 404);

    return c.json({
      success: true,
      data: {
        plan: row.plan,
        plan_name: PLANS[row.plan as keyof typeof PLANS]?.name ?? 'Free',
        price: PLANS[row.plan as keyof typeof PLANS]?.price ?? 0,
        has_payment_method: !!row.stripe_customer_id,
        has_subscription: !!row.stripe_subscription_id,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load billing' }, 500);
  }
});

/**
 * POST /api/billing/upgrade — create Stripe Checkout session or fall back to mock
 */
authed.post('/upgrade', async (c) => {
  const user = c.get('user');

  // If no Stripe key configured, use mock mode for development
  if (!c.env.STRIPE_SECRET_KEY) {
    return mockUpgrade(c, user);
  }

  try {
    // Get or create Stripe customer
    let row = await c.env.DB.prepare(
      'SELECT stripe_customer_id FROM users WHERE id = ?'
    ).bind(user.id).first<{ stripe_customer_id: string | null }>();

    let customerId = row?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeRequest('POST', '/customers', c.env.STRIPE_SECRET_KEY, {
        email: user.email,
        'metadata[bytlinks_user_id]': user.id,
      });
      customerId = customer.id as string;
      await c.env.DB.prepare(
        'UPDATE users SET stripe_customer_id = ? WHERE id = ?'
      ).bind(customerId, user.id).run();
    }

    // Create Checkout Session
    const baseUrl = new URL(c.req.url).origin || 'https://www.bytlinks.com';
    const session = await stripeRequest('POST', '/checkout/sessions', c.env.STRIPE_SECRET_KEY, {
      customer: customerId,
      mode: 'subscription',
      'line_items[0][price]': c.env.STRIPE_PRO_PRICE_ID || '',
      'line_items[0][quantity]': '1',
      success_url: `${baseUrl}/dashboard?upgraded=1`,
      cancel_url: `${baseUrl}/dashboard?upgraded=0`,
      'metadata[bytlinks_user_id]': user.id,
    });

    if (session.url) {
      return c.json({ success: true, data: { checkout_url: session.url } });
    }

    // Log Stripe error but don't expose to client
    const stripeErr = (session.error as Record<string, unknown>)?.message;
    if (stripeErr) console.error('Stripe checkout error:', stripeErr);
    return c.json({ success: false, error: 'Failed to create checkout session' }, 500);
  } catch (err) {
    console.error('Upgrade error:', err);
    return c.json({ success: false, error: 'Upgrade failed' }, 500);
  }
});

/**
 * POST /api/billing/downgrade — cancel subscription or fall back to mock
 */
authed.post('/downgrade', async (c) => {
  const user = c.get('user');

  if (!c.env.STRIPE_SECRET_KEY) {
    return mockDowngrade(c, user);
  }

  try {
    const row = await c.env.DB.prepare(
      'SELECT stripe_subscription_id FROM users WHERE id = ?'
    ).bind(user.id).first<{ stripe_subscription_id: string | null }>();

    if (row?.stripe_subscription_id) {
      // Cancel at period end (user keeps Pro until billing cycle ends)
      await stripeRequest('POST', `/subscriptions/${row.stripe_subscription_id}`, c.env.STRIPE_SECRET_KEY, {
        cancel_at_period_end: 'true',
      });
    }

    return c.json({ success: true, data: { message: 'Subscription will cancel at end of billing period.' } });
  } catch {
    return c.json({ success: false, error: 'Downgrade failed' }, 500);
  }
});

/**
 * POST /api/billing/portal — create Stripe Customer Portal session
 */
authed.post('/portal', async (c) => {
  const user = c.get('user');

  if (!c.env.STRIPE_SECRET_KEY) {
    return c.json({ success: false, error: 'Billing portal not available in demo mode.' }, 400);
  }

  try {
    const row = await c.env.DB.prepare(
      'SELECT stripe_customer_id FROM users WHERE id = ?'
    ).bind(user.id).first<{ stripe_customer_id: string | null }>();

    if (!row?.stripe_customer_id) {
      return c.json({ success: false, error: 'No billing account found' }, 400);
    }

    const baseUrl = new URL(c.req.url).origin || 'https://www.bytlinks.com';
    const session = await stripeRequest('POST', '/billing_portal/sessions', c.env.STRIPE_SECRET_KEY, {
      customer: row.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`,
    });

    if (session.url) {
      return c.json({ success: true, data: { portal_url: session.url } });
    }

    return c.json({ success: false, error: 'Failed to create portal session' }, 500);
  } catch {
    return c.json({ success: false, error: 'Portal failed' }, 500);
  }
});

// ── Webhook (no auth middleware — Stripe signs these) ──
// MUST be registered before authed routes so auth middleware doesn't intercept it.

/**
 * POST /api/billing/webhook — handle Stripe webhook events
 */
billingRoutes.post('/webhook', async (c) => {
  if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: 'Webhooks not configured' }, 400);
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  const rawBody = await c.req.text();

  // Verify webhook signature
  const isValid = await verifyStripeSignature(rawBody, signature, c.env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
  const obj = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = (obj.metadata as Record<string, string>)?.bytlinks_user_id;
        const subscriptionId = obj.subscription as string;
        const customerId = obj.customer as string;

        if (userId && subscriptionId) {
          await c.env.DB.batch([
            c.env.DB.prepare(
              "UPDATE users SET plan = 'pro', stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?"
            ).bind(customerId, subscriptionId, userId),
            c.env.DB.prepare(
              'UPDATE bio_pages SET show_branding = 0 WHERE user_id = ?'
            ).bind(userId),
          ]);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subId = obj.id as string;
        const user = await c.env.DB.prepare(
          'SELECT id FROM users WHERE stripe_subscription_id = ?'
        ).bind(subId).first<{ id: string }>();

        if (user) {
          await c.env.DB.batch([
            c.env.DB.prepare(
              "UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE id = ?"
            ).bind(user.id),
            c.env.DB.prepare(
              'UPDATE bio_pages SET show_branding = 1 WHERE user_id = ?'
            ).bind(user.id),
          ]);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = obj.customer as string;
        const user = await c.env.DB.prepare(
          'SELECT id, email FROM users WHERE stripe_customer_id = ?'
        ).bind(customerId).first<{ id: string; email: string }>();

        if (user && c.env.RESEND_API_KEY) {
          const { sendEmail } = await import('../utils/email');
          c.executionCtx.waitUntil(
            sendEmail(c.env.RESEND_API_KEY, {
              to: user.email,
              subject: 'BytLinks — Payment failed',
              html: `<p>Your latest payment for BytLinks Pro failed. Please update your payment method to keep your Pro features.</p><p><a href="https://www.bytlinks.com/dashboard">Update payment method</a></p>`,
            })
          );
        }
        break;
      }
    }
  } catch {
    // Log but don't fail — Stripe retries on 5xx
  }

  return c.json({ received: true });
});

// Mount authenticated routes after webhook
billingRoutes.route('/', authed);

// ── Stripe webhook signature verification ──

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = header.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key.trim()] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;

    // Reject if timestamp is older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computed = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison
    if (computed.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── Mock fallbacks for development (no Stripe keys configured) ──

async function mockUpgrade(c: { env: Env; get: (k: string) => AuthUser; header: (k: string, v: string) => void; json: (d: unknown, s?: number) => Response }, user: AuthUser) {
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE users SET plan = 'pro', stripe_customer_id = ? WHERE id = ?"
      ).bind(`mock_cus_${crypto.randomUUID().slice(0, 8)}`, user.id),
      c.env.DB.prepare(
        'UPDATE bio_pages SET show_branding = 0 WHERE user_id = ?'
      ).bind(user.id),
    ]);

    const token = await createJwt(
      { sub: user.id, email: user.email, plan: 'pro' },
      c.env.JWT_SECRET,
    );
    c.header('Set-Cookie', `token=${token}; ${COOKIE_OPTS}`);

    return c.json({ success: true, data: { plan: 'pro', mock: true } });
  } catch {
    return c.json({ success: false, error: 'Upgrade failed' }, 500);
  }
}

async function mockDowngrade(c: { env: Env; get: (k: string) => AuthUser; header: (k: string, v: string) => void; json: (d: unknown, s?: number) => Response }, user: AuthUser) {
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
    c.header('Set-Cookie', `token=${token}; ${COOKIE_OPTS}`);

    return c.json({ success: true, data: { plan: 'free', mock: true } });
  } catch {
    return c.json({ success: false, error: 'Downgrade failed' }, 500);
  }
}
