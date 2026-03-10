import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { isBlockedUrl, NSFW_ERROR_MESSAGE } from '../validators/nsfw';

export const linkRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

linkRoutes.use('*', authMiddleware);

/**
 * Helper: get the user's page ID from their user ID.
 */
async function getPageId(db: D1Database, userId: string): Promise<string | null> {
  const page = await db.prepare(
    'SELECT id FROM bio_pages WHERE user_id = ?'
  ).bind(userId).first<{ id: string }>();
  return page?.id ?? null;
}

/**
 * GET /api/links — list all links for the current user's page
 */
linkRoutes.get('/', async (c) => {
  const user = c.get('user');

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const links = await c.env.DB.prepare(
      'SELECT * FROM links WHERE page_id = ? ORDER BY order_num'
    ).bind(pageId).all();

    const parsed = links.results.map((l: Record<string, unknown>) => ({
      ...l,
      style_overrides: l.style_overrides ? JSON.parse(l.style_overrides as string) : null,
    }));
    return c.json({ success: true, data: parsed });
  } catch {
    return c.json({ success: false, error: 'Failed to load links' }, 500);
  }
});

/**
 * POST /api/links — create a new link
 */
linkRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    title?: string;
    url?: string;
    description?: string;
    icon?: string;
    is_featured?: boolean;
  }>();

  if (!body.title || !body.url) {
    return c.json({ success: false, error: 'Title and URL are required' }, 400);
  }

  if (isBlockedUrl(body.url)) {
    return c.json({ success: false, error: NSFW_ERROR_MESSAGE }, 400);
  }

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const maxOrder = await c.env.DB.prepare(
      'SELECT MAX(order_num) as max_order FROM links WHERE page_id = ?'
    ).bind(pageId).first<{ max_order: number | null }>();

    const linkId = crypto.randomUUID();
    const orderNum = (maxOrder?.max_order ?? -1) + 1;

    await c.env.DB.prepare(
      `INSERT INTO links (id, page_id, title, url, description, icon, is_featured, order_num)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      linkId, pageId, body.title, body.url,
      body.description ?? null, body.icon ?? null,
      body.is_featured ? 1 : 0, orderNum,
    ).run();

    return c.json({
      success: true,
      data: {
        id: linkId, page_id: pageId, title: body.title, url: body.url,
        description: body.description ?? null, icon: body.icon ?? null,
        is_featured: !!body.is_featured, is_visible: true,
        order_num: orderNum, click_count: 0,
      },
    }, 201);
  } catch {
    return c.json({ success: false, error: 'Failed to create link' }, 500);
  }
});

/**
 * PUT /api/links/reorder — bulk update link order
 * NOTE: Must be registered before /:id to avoid being caught by the wildcard.
 */
linkRoutes.put('/reorder', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ order: { id: string; order_num: number }[] }>();

  if (!body.order || !Array.isArray(body.order)) {
    return c.json({ success: false, error: 'Order array is required' }, 400);
  }

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const statements = body.order.map(({ id, order_num }) =>
      c.env.DB.prepare(
        'UPDATE links SET order_num = ? WHERE id = ? AND page_id = ?'
      ).bind(order_num, id, pageId)
    );

    await c.env.DB.batch(statements);

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to reorder links' }, 500);
  }
});

/**
 * PUT /api/links/:id — update a link
 */
linkRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const linkId = c.req.param('id');
  const body = await c.req.json<{
    title?: string;
    url?: string;
    description?: string;
    icon?: string;
    is_featured?: boolean;
    is_visible?: boolean;
    order_num?: number;
    style_overrides?: Record<string, unknown> | null;
  }>();

  if (body.url && isBlockedUrl(body.url)) {
    return c.json({ success: false, error: NSFW_ERROR_MESSAGE }, 400);
  }

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const existing = await c.env.DB.prepare(
      'SELECT id FROM links WHERE id = ? AND page_id = ?'
    ).bind(linkId, pageId).first();

    if (!existing) {
      return c.json({ success: false, error: 'Link not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.url !== undefined) { updates.push('url = ?'); values.push(body.url); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.icon !== undefined) { updates.push('icon = ?'); values.push(body.icon); }
    if (body.is_featured !== undefined) { updates.push('is_featured = ?'); values.push(body.is_featured ? 1 : 0); }
    if (body.is_visible !== undefined) { updates.push('is_visible = ?'); values.push(body.is_visible ? 1 : 0); }
    if (body.order_num !== undefined) { updates.push('order_num = ?'); values.push(body.order_num); }
    if (body.style_overrides !== undefined) {
      updates.push('style_overrides = ?');
      values.push(body.style_overrides ? JSON.stringify(body.style_overrides) : null);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(linkId);

    await c.env.DB.prepare(
      `UPDATE links SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update link' }, 500);
  }
});

/**
 * DELETE /api/links/:id — delete a link
 */
linkRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const linkId = c.req.param('id');

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const result = await c.env.DB.prepare(
      'DELETE FROM links WHERE id = ? AND page_id = ?'
    ).bind(linkId, pageId).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Link not found' }, 404);
    }

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete link' }, 500);
  }
});

