/** D1-backed rate limiter — persistent across Worker restarts/deploys. */

export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  const result = await db.prepare(
    'SELECT attempts, window_start FROM rate_limits WHERE key = ?'
  ).bind(key).first<{ attempts: number; window_start: number }>();

  if (!result || result.window_start < windowStart) {
    // New window or expired — reset
    await db.prepare(
      'INSERT OR REPLACE INTO rate_limits (key, attempts, window_start) VALUES (?, 1, ?)'
    ).bind(key, now).run();
    return true;
  }

  if (result.attempts >= maxAttempts) {
    return false;
  }

  await db.prepare(
    'UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?'
  ).bind(key).run();
  return true;
}

/** Periodically clean up expired rate limit entries (call from cron). */
export async function cleanupRateLimits(db: D1Database, maxAgeSeconds: number = 7200): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
}
