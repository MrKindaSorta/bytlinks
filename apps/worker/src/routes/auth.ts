import { Hono } from 'hono';
import type { Env } from '../index';
import { hashPassword, verifyPassword, createJwt, verifyJwt } from '../utils/crypto';
import type { AuthUser } from '../middleware/auth';

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

  return c.json({
    success: true,
    data: {
      user: { id: payload.sub, email: payload.email, plan: payload.plan },
    },
  });
});
