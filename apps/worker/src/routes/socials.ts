import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const socialRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

socialRoutes.use('*', authMiddleware);

async function getPageId(db: D1Database, userId: string): Promise<string | null> {
  const page = await db.prepare(
    'SELECT id FROM bio_pages WHERE user_id = ?'
  ).bind(userId).first<{ id: string }>();
  return page?.id ?? null;
}

/**
 * GET /api/socials — list social links
 */
socialRoutes.get('/', async (c) => {
  const user = c.get('user');
  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const socials = await c.env.DB.prepare(
      'SELECT * FROM social_links WHERE page_id = ? ORDER BY order_num'
    ).bind(pageId).all();

    return c.json({ success: true, data: socials.results });
  } catch {
    return c.json({ success: false, error: 'Failed to load social links' }, 500);
  }
});

/**
 * POST /api/socials — add a social link
 */
socialRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ platform?: string; url?: string; icon_style?: string }>();

  if (!body.platform || !body.url) {
    return c.json({ success: false, error: 'Platform and URL are required' }, 400);
  }

  const iconStyle = body.icon_style ?? 'plain';

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const maxOrder = await c.env.DB.prepare(
      'SELECT MAX(order_num) as max_order FROM social_links WHERE page_id = ?'
    ).bind(pageId).first<{ max_order: number | null }>();

    const id = crypto.randomUUID();
    const orderNum = (maxOrder?.max_order ?? -1) + 1;

    await c.env.DB.prepare(
      'INSERT INTO social_links (id, page_id, platform, url, icon_style, order_num) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, pageId, body.platform, body.url, iconStyle, orderNum).run();

    return c.json({
      success: true,
      data: { id, page_id: pageId, platform: body.platform, url: body.url, icon_style: iconStyle, order_num: orderNum },
    }, 201);
  } catch {
    return c.json({ success: false, error: 'Failed to add social link' }, 500);
  }
});

/**
 * PUT /api/socials/reorder — bulk update social link order
 * NOTE: Must be registered before /:id to avoid being caught by the wildcard.
 */
socialRoutes.put('/reorder', async (c) => {
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
        'UPDATE social_links SET order_num = ? WHERE id = ? AND page_id = ?'
      ).bind(order_num, id, pageId)
    );

    await c.env.DB.batch(statements);

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to reorder social links' }, 500);
  }
});

/**
 * PUT /api/socials/:id — update a social link
 */
socialRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const socialId = c.req.param('id');
  const body = await c.req.json<{ platform?: string; url?: string; icon_style?: string }>();

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.platform) { updates.push('platform = ?'); values.push(body.platform); }
    if (body.url) { updates.push('url = ?'); values.push(body.url); }
    if (body.icon_style) { updates.push('icon_style = ?'); values.push(body.icon_style); }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(socialId, pageId);

    await c.env.DB.prepare(
      `UPDATE social_links SET ${updates.join(', ')} WHERE id = ? AND page_id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update social link' }, 500);
  }
});

/**
 * DELETE /api/socials/:id — delete a social link
 */
socialRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const socialId = c.req.param('id');

  try {
    const pageId = await getPageId(c.env.DB, user.id);
    if (!pageId) return c.json({ success: false, error: 'No page found' }, 404);

    await c.env.DB.prepare(
      'DELETE FROM social_links WHERE id = ? AND page_id = ?'
    ).bind(socialId, pageId).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete social link' }, 500);
  }
});
