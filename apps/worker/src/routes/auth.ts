import { Hono } from 'hono';
import type { Env } from '../index';
import { hashPassword, verifyPassword, createJwt, verifyJwt } from '../utils/crypto';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

const COOKIE_OPTIONS = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800';

/**
 * POST /api/auth/register
 * Body: { email, password, username }
 */
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; username?: string }>();
  const { email, password, username } = body;

  if (!email || !password || !username) {
    return c.json({ success: false, error: 'Email, password, and username are required' }, 400);
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
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return c.json({ success: false, error: 'An account with this email already exists' }, 409);
    }

    const existingUsername = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE username = ?'
    ).bind(username).first();

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
        `INSERT INTO bio_pages (id, user_id, username, display_name, theme)
         VALUES (?, ?, ?, ?, ?)`
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
 * Returns the current user from the JWT cookie (no DB hit).
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

  // Look up verified status from DB
  const dbUser = await c.env.DB.prepare(
    'SELECT verified FROM users WHERE id = ?'
  ).bind(payload.sub).first<{ verified: number }>();

  return c.json({
    success: true,
    data: {
      user: {
        id: payload.sub,
        email: payload.email,
        plan: payload.plan,
        verified: !!(dbUser?.verified),
      },
    },
  });
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
