import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const seoRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

seoRoutes.use('*', authMiddleware);

/**
 * GET /api/seo/settings — current user's SEO overrides
 */
seoRoutes.get('/settings', async (c) => {
  const user = c.get('user');

  try {
    const row = await c.env.DB.prepare(
      'SELECT seo_title, seo_description, seo_keywords, created_at FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ seo_title: string | null; seo_description: string | null; seo_keywords: string | null; created_at: number }>();

    if (!row) return c.json({ success: false, error: 'Page not found' }, 404);

    return c.json({
      success: true,
      data: {
        seo_title: row.seo_title,
        seo_description: row.seo_description,
        seo_keywords: row.seo_keywords,
        created_at: row.created_at,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load SEO settings' }, 500);
  }
});

/**
 * PATCH /api/seo/settings — update SEO overrides
 */
seoRoutes.patch('/settings', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    seo_title?: string | null;
    seo_description?: string | null;
    seo_keywords?: string | null;
  }>();

  // Validate seo_title
  if (body.seo_title !== undefined && body.seo_title !== null) {
    if (body.seo_title.length > 60) {
      return c.json({ success: false, error: 'Page title must be 60 characters or fewer.' }, 400);
    }
  }

  // Validate seo_description
  if (body.seo_description !== undefined && body.seo_description !== null) {
    if (body.seo_description.length > 160) {
      return c.json({ success: false, error: 'Meta description must be 160 characters or fewer.' }, 400);
    }
  }

  // Validate seo_keywords
  let cleanedKeywords: string | null = null;
  if (body.seo_keywords !== undefined && body.seo_keywords !== null) {
    if (body.seo_keywords.length > 200) {
      return c.json({ success: false, error: 'Keywords must be 200 characters or fewer in total.' }, 400);
    }
    const tags = body.seo_keywords
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 10) {
      return c.json({ success: false, error: 'Maximum 10 keyword tags allowed.' }, 400);
    }
    for (const tag of tags) {
      if (tag.length > 30) {
        return c.json({ success: false, error: `Each keyword must be 30 characters or fewer. "${tag.slice(0, 20)}..." is too long.` }, 400);
      }
    }
    cleanedKeywords = tags.length > 0 ? tags.join(', ') : null;
  }

  try {
    const seoTitle = body.seo_title === undefined ? undefined : (body.seo_title || null);
    const seoDescription = body.seo_description === undefined ? undefined : (body.seo_description || null);
    const seoKeywords = body.seo_keywords === undefined ? undefined : cleanedKeywords;

    // Build dynamic SET clause — only update provided fields
    const sets: string[] = [];
    const values: (string | null)[] = [];

    if (seoTitle !== undefined) {
      sets.push('seo_title = ?');
      values.push(seoTitle);
    }
    if (seoDescription !== undefined) {
      sets.push('seo_description = ?');
      values.push(seoDescription);
    }
    if (seoKeywords !== undefined) {
      sets.push('seo_keywords = ?');
      values.push(seoKeywords);
    }

    if (sets.length === 0) {
      return c.json({ success: false, error: 'No fields to update.' }, 400);
    }

    values.push(user.id);
    await c.env.DB.prepare(
      `UPDATE bio_pages SET ${sets.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    // Return updated values
    const row = await c.env.DB.prepare(
      'SELECT seo_title, seo_description, seo_keywords FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ seo_title: string | null; seo_description: string | null; seo_keywords: string | null }>();

    return c.json({
      success: true,
      data: {
        seo_title: row?.seo_title ?? null,
        seo_description: row?.seo_description ?? null,
        seo_keywords: row?.seo_keywords ?? null,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to save SEO settings' }, 500);
  }
});
