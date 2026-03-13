import { Hono } from 'hono';
import type { Env } from '../index';
import { hashPassword, verifyPassword, createJwt, verifyJwt } from '../utils/crypto';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { checkRateLimit } from '../utils/rateLimit';
import { sendEmail, buildWelcomeEmail, buildPasswordResetEmail } from '../utils/email';

export const authRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

export const COOKIE_OPTIONS = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Body: { email, password, username }
 */
authRoutes.post('/register', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 5 registration attempts per IP per hour
  const allowed = await checkRateLimit(c.env.DB, `register:${ip}`, 5, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many registration attempts. Try again later.' }, 429);
  }

  const body = await c.req.json<{ email?: string; password?: string; username?: string }>();
  const { email, password, username } = body;

  if (!email || !password || !username) {
    return c.json({ success: false, error: 'Email, password, and username are required' }, 400);
  }

  if (!EMAIL_RE.test(email)) {
    return c.json({ success: false, error: 'Please enter a valid email address' }, 400);
  }

  if (password.length < 8) {
    return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
  }

  const usernameRe = /^[a-z0-9_-]{3,30}$/;
  if (!usernameRe.test(username)) {
    return c.json({
      success: false,
      error: 'Username must be 3-30 characters: lowercase letters, numbers, hyphens, underscores',
    }, 400);
  }

  try {
    const [existingUser, existingUsername] = await Promise.all([
      c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first(),
      c.env.DB.prepare('SELECT id FROM bio_pages WHERE username = ?').bind(username).first(),
    ]);

    // Generic message for email to prevent account enumeration
    if (existingUser) {
      return c.json({ success: false, error: 'Unable to create account. This email may already be registered.' }, 409);
    }

    if (existingUsername) {
      return c.json({ success: false, error: 'This username is already taken' }, 409);
    }

    const userId = crypto.randomUUID();
    const pageId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, plan) VALUES (?, ?, ?, ?)'
      ).bind(userId, email, passwordHash, 'free'),
      c.env.DB.prepare(
        `INSERT INTO bio_pages (id, user_id, username, display_name, theme, updated_at)
         VALUES (?, ?, ?, ?, ?, unixepoch())`
      ).bind(pageId, userId, username, username, JSON.stringify({
        base: 'minimal',
        colorMode: 'preset',
        preset: 'ink',
        buttonStyle: 'filled',
        fontPair: 'grotesque',
        animation: 'fade',
        socialStyle: 'icon-only',
        spacing: 'comfortable',
        layoutVariant: 'centered',
      })),
    ]);

    const token = await createJwt(
      { sub: userId, email, plan: 'free' },
      c.env.JWT_SECRET,
    );

    c.header('Set-Cookie', `token=${token}; ${COOKIE_OPTIONS}`);

    // Send welcome email (non-blocking — don't fail registration if email fails)
    if (c.env.RESEND_API_KEY) {
      const welcomeEmail = buildWelcomeEmail(username);
      c.executionCtx.waitUntil(
        sendEmail(c.env.RESEND_API_KEY, { to: email, ...welcomeEmail })
      );
    }

    return c.json({
      success: true,
      data: { user: { id: userId, email, plan: 'free' }, username },
    });
  } catch (err) {
    return c.json({ success: false, error: 'Registration failed. Try again.' }, 500);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
authRoutes.post('/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 10 login attempts per IP per 15 minutes
  const allowed = await checkRateLimit(c.env.DB, `login:${ip}`, 10, 900);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many login attempts. Try again in 15 minutes.' }, 429);
  }

  const body = await c.req.json<{ email?: string; password?: string }>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: 'Email and password are required' }, 400);
  }

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, plan FROM users WHERE email = ?'
    ).bind(email).first<{ id: string; email: string; password_hash: string; plan: string }>();

    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const token = await createJwt(
      { sub: user.id, email: user.email, plan: user.plan },
      c.env.JWT_SECRET,
    );

    c.header('Set-Cookie', `token=${token}; ${COOKIE_OPTIONS}`);

    return c.json({
      success: true,
      data: { user: { id: user.id, email: user.email, plan: user.plan } },
    });
  } catch (err) {
    return c.json({ success: false, error: 'Login failed. Try again.' }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
authRoutes.post('/logout', async (c) => {
  c.header('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return c.json({ success: true });
});

/**
 * GET /api/auth/me
 * Returns the current user. Plan is always read from the database (source of
 * truth) so that Stripe webhook updates are reflected immediately. If the JWT
 * contains a stale plan value, a fresh JWT cookie is issued automatically.
 */
authRoutes.get('/me', async (c) => {
  const cookieHeader = c.req.header('cookie');
  if (!cookieHeader) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const payload = await verifyJwt(match[1], c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  const dbUser = await c.env.DB.prepare(
    'SELECT plan, verified FROM users WHERE id = ?'
  ).bind(payload.sub).first<{ plan: string; verified: number }>();

  if (!dbUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  const plan = dbUser.plan || 'free';

  // Auto-heal stale JWT: if the DB plan differs (e.g. Stripe webhook upgraded
  // the user while the old JWT was still in the cookie), reissue immediately.
  if (plan !== payload.plan) {
    const token = await createJwt(
      { sub: payload.sub, email: payload.email, plan },
      c.env.JWT_SECRET,
    );
    c.header('Set-Cookie', `token=${token}; ${COOKIE_OPTIONS}`);
  }

  return c.json({
    success: true,
    data: {
      user: {
        id: payload.sub,
        email: payload.email,
        plan,
        verified: !!dbUser.verified,
      },
    },
  });
});

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email with a time-limited token.
 */
authRoutes.post('/forgot-password', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 3 reset requests per IP per hour
  const allowed = await checkRateLimit(c.env.DB, `reset:${ip}`, 3, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many reset attempts. Try again later.' }, 429);
  }

  const body = await c.req.json<{ email?: string }>();
  const { email } = body;

  if (!email || !EMAIL_RE.test(email)) {
    return c.json({ success: false, error: 'Please enter a valid email address' }, 400);
  }

  // Always return success to prevent account enumeration
  const successResponse = () =>
    c.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });

  try {
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first<{ id: string }>();

    if (!user) return successResponse();

    if (!c.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return successResponse();
    }

    // Generate a secure random token
    const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const tokenId = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // Invalidate any existing unused tokens for this user
    await c.env.DB.prepare(
      'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0'
    ).bind(user.id).run();

    // Store new token
    await c.env.DB.prepare(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(tokenId, user.id, tokenHash, expiresAt).run();

    // Send reset email
    const baseUrl = new URL(c.req.url).origin || 'https://www.bytlinks.com';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const resetEmail = buildPasswordResetEmail(resetUrl);
    await sendEmail(c.env.RESEND_API_KEY, { to: email, ...resetEmail });

    return successResponse();
  } catch {
    return successResponse();
  }
});

/**
 * POST /api/auth/reset-password
 * Validates token and sets a new password.
 */
authRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json<{ token?: string; password?: string }>();
  const { token, password } = body;

  if (!token || !password) {
    return c.json({ success: false, error: 'Token and new password are required' }, 400);
  }

  if (password.length < 8) {
    return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
  }

  try {
    const tokenHash = await hashToken(token);
    const now = Math.floor(Date.now() / 1000);

    const row = await c.env.DB.prepare(
      'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used = 0 AND expires_at > ?'
    ).bind(tokenHash, now).first<{ id: string; user_id: string }>();

    if (!row) {
      return c.json({ success: false, error: 'Invalid or expired reset link. Please request a new one.' }, 400);
    }

    const newHash = await hashPassword(password);

    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, row.user_id),
      c.env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').bind(row.id),
    ]);

    return c.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch {
    return c.json({ success: false, error: 'Failed to reset password. Try again.' }, 500);
  }
});

/** Hash a reset token using SHA-256 for storage (we never store the raw token). */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/auth/dismiss-onboarding
 * Marks the onboarding checklist as dismissed.
 */
authRoutes.post('/dismiss-onboarding', authMiddleware, async (c) => {
  const user = c.get('user');
  try {
    await c.env.DB.prepare(
      'UPDATE users SET dismissed_onboarding = 1 WHERE id = ?'
    ).bind(user.id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to dismiss' }, 500);
  }
});

/**
 * DELETE /api/auth/account
 * Permanently deletes the user's account and all associated data.
 * Requires password confirmation and the confirmation phrase "DELETE MY ACCOUNT".
 */
authRoutes.delete('/account', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ password?: string; confirmation?: string }>();

  if (!body.password) {
    return c.json({ success: false, error: 'Password is required' }, 400);
  }

  if (body.confirmation !== 'DELETE MY ACCOUNT') {
    return c.json({ success: false, error: 'Confirmation phrase does not match' }, 400);
  }

  try {
    // Verify password before proceeding
    const dbUser = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(user.id).first<{ password_hash: string }>();

    if (!dbUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const valid = await verifyPassword(body.password, dbUser.password_hash);
    if (!valid) {
      return c.json({ success: false, error: 'Incorrect password' }, 401);
    }

    // Get page IDs to clean up R2 storage
    const pages = await c.env.DB.prepare(
      'SELECT id, avatar_r2_key FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).all<{ id: string; avatar_r2_key: string | null }>();

    // Delete R2 objects (avatar + block files) — best effort
    const r2Deletes: Promise<void>[] = [];
    for (const page of pages.results) {
      if (page.avatar_r2_key) {
        r2Deletes.push(c.env.STORAGE.delete(page.avatar_r2_key));
      }
    }
    // Clean up any block file uploads
    const blockFiles = await c.env.DB.prepare(
      `SELECT data FROM content_blocks WHERE page_id IN
       (SELECT id FROM bio_pages WHERE user_id = ?)`
    ).bind(user.id).all<{ data: string }>();
    for (const row of blockFiles.results) {
      try {
        const data = JSON.parse(row.data);
        if (data.r2_key) r2Deletes.push(c.env.STORAGE.delete(data.r2_key));
        if (data.image_r2_key) r2Deletes.push(c.env.STORAGE.delete(data.image_r2_key));
        if (Array.isArray(data.images)) {
          for (const img of data.images) {
            if (img.r2_key) r2Deletes.push(c.env.STORAGE.delete(img.r2_key));
          }
        }
      } catch { /* skip unparseable */ }
    }
    await Promise.allSettled(r2Deletes);

    // Delete user — CASCADE handles bio_pages, links, social_links, content_blocks, etc.
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM verification_requests WHERE user_id = ?').bind(user.id),
      c.env.DB.prepare('DELETE FROM import_rate_limits WHERE user_id = ?').bind(user.id),
      c.env.DB.prepare('DELETE FROM analytics_events WHERE page_id IN (SELECT id FROM bio_pages WHERE user_id = ?)').bind(user.id),
      c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);

    // Clear auth cookie
    c.header('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete account' }, 500);
  }
});
