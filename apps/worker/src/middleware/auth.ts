import type { Context, Next } from 'hono';
import type { Env } from '../index';
import { verifyJwt } from '../utils/crypto';

export type AuthUser = {
  id: string;
  email: string;
  plan: string;
};

/**
 * Parses the "token" value from a cookie header string.
 */
function getTokenFromCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * JWT auth middleware. Verifies the httpOnly cookie and sets c.set('user', ...).
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>,
  next: Next,
) {
  const cookieHeader = c.req.header('cookie');

  if (!cookieHeader) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const token = getTokenFromCookie(cookieHeader);
  if (!token) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    plan: payload.plan,
  });

  await next();
}
