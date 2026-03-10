import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { BLOCK_LIMITS } from '@bytlinks/shared/constants';
import { scrapeOg } from '../utils/ogScraper';

export const blockRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

blockRoutes.use('*', authMiddleware);

/**
 * GET /api/blocks/og?url=<encoded> — scrape OG metadata from a URL
 */
blockRoutes.get('/og', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ success: false, error: 'url param is required' }, 400);

  try {
    new URL(url); // validate
  } catch {
    return c.json({ success: false, error: 'Invalid URL' }, 400);
  }

  try {
    const meta = await scrapeOg(url);
    return c.json({ success: true, data: meta });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch metadata' }, 502);
  }
});

/**
 * GET /api/blocks — list all content blocks for user's page
 */
blockRoutes.get('/', async (c) => {
  const user = c.get('user');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    const blocks = await c.env.DB.prepare(
      'SELECT * FROM content_blocks WHERE page_id = ? ORDER BY created_at'
    ).bind(page.id).all();

    return c.json({
      success: true,
      data: blocks.results.map((b: Record<string, unknown>) => ({
        ...b,
        data: JSON.parse(b.data as string),
        is_visible: !!b.is_visible,
      })),
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load blocks' }, 500);
  }
});

/**
 * POST /api/blocks — create a content block, auto-append to section_order
 */
blockRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    block_type: string;
    title?: string;
    data?: Record<string, unknown>;
    insert_index?: number;
  }>();

  if (!body.block_type) {
    return c.json({ success: false, error: 'block_type is required' }, 400);
  }

  try {
    const page = await c.env.DB.prepare(
      'SELECT id, section_order FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string; section_order: string | null }>();

    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    // Check plan limits — business uses pro limits; fallback to free
    const plan = user.plan || 'free';
    const limits = BLOCK_LIMITS[plan as keyof typeof BLOCK_LIMITS] || BLOCK_LIMITS.pro;

    const existingCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM content_blocks WHERE page_id = ?'
    ).bind(page.id).first<{ cnt: number }>();

    if (existingCount && existingCount.cnt >= limits.max_blocks) {
      return c.json({ success: false, error: `Block limit reached (${limits.max_blocks})` }, 403);
    }

    if (limits.allowed_types !== 'all' && !(limits.allowed_types as readonly string[]).includes(body.block_type)) {
      return c.json({ success: false, error: 'This block type requires a Pro plan' }, 403);
    }

    const id = crypto.randomUUID();
    const data = JSON.stringify(body.data || {});

    await c.env.DB.prepare(
      'INSERT INTO content_blocks (id, page_id, block_type, title, data) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, page.id, body.block_type, body.title || null, data).run();

    // Insert into section_order at specified position (or append)
    const currentOrder: string[] = page.section_order
      ? JSON.parse(page.section_order)
      : ['social_links', 'links'];
    const entry = `block:${id}`;
    if (body.insert_index != null && body.insert_index >= 0 && body.insert_index <= currentOrder.length) {
      currentOrder.splice(body.insert_index, 0, entry);
    } else {
      currentOrder.push(entry);
    }

    await c.env.DB.prepare(
      'UPDATE bio_pages SET section_order = ? WHERE id = ?'
    ).bind(JSON.stringify(currentOrder), page.id).run();

    return c.json({
      success: true,
      data: {
        id,
        page_id: page.id,
        block_type: body.block_type,
        title: body.title || null,
        data: body.data || {},
        is_visible: true,
        created_at: Math.floor(Date.now() / 1000),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to create block' }, 500);
  }
});

/**
 * PUT /api/blocks/:id — update block title/data/visibility
 */
blockRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('id');
  const body = await c.req.json<{
    title?: string;
    data?: Record<string, unknown>;
    is_visible?: boolean;
    column_span?: 'full' | 'half' | null;
  }>();

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    // Verify block belongs to this page
    const block = await c.env.DB.prepare(
      'SELECT id FROM content_blocks WHERE id = ? AND page_id = ?'
    ).bind(blockId, page.id).first();

    if (!block) return c.json({ success: false, error: 'Block not found' }, 404);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.data !== undefined) {
      updates.push('data = ?');
      values.push(JSON.stringify(body.data));
    }
    if (body.is_visible !== undefined) {
      updates.push('is_visible = ?');
      values.push(body.is_visible ? 1 : 0);
    }
    if (body.column_span !== undefined) {
      updates.push('column_span = ?');
      values.push(body.column_span);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(blockId);

    await c.env.DB.prepare(
      `UPDATE content_blocks SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update block' }, 500);
  }
});

/**
 * POST /api/blocks/:id/duplicate — duplicate a block, insert after source in section_order
 */
blockRoutes.post('/:id/duplicate', async (c) => {
  const user = c.get('user');
  const sourceId = c.req.param('id');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id, section_order FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string; section_order: string | null }>();

    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    // Check plan limits
    const plan = user.plan || 'free';
    const limits = BLOCK_LIMITS[plan as keyof typeof BLOCK_LIMITS] || BLOCK_LIMITS.pro;

    const existingCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM content_blocks WHERE page_id = ?'
    ).bind(page.id).first<{ cnt: number }>();

    if (existingCount && existingCount.cnt >= limits.max_blocks) {
      return c.json({ success: false, error: `Block limit reached (${limits.max_blocks})` }, 403);
    }

    const source = await c.env.DB.prepare(
      'SELECT * FROM content_blocks WHERE id = ? AND page_id = ?'
    ).bind(sourceId, page.id).first<Record<string, unknown>>();

    if (!source) return c.json({ success: false, error: 'Block not found' }, 404);

    const newId = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO content_blocks (id, page_id, block_type, title, data, is_visible, column_span) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(newId, page.id, source.block_type, source.title, source.data, source.is_visible, source.column_span ?? null).run();

    // Insert into section_order right after the source block
    const currentOrder: string[] = page.section_order
      ? JSON.parse(page.section_order)
      : ['social_links', 'links'];
    const sourceIdx = currentOrder.indexOf(`block:${sourceId}`);
    if (sourceIdx >= 0) {
      currentOrder.splice(sourceIdx + 1, 0, `block:${newId}`);
    } else {
      currentOrder.push(`block:${newId}`);
    }

    await c.env.DB.prepare(
      'UPDATE bio_pages SET section_order = ? WHERE id = ?'
    ).bind(JSON.stringify(currentOrder), page.id).run();

    return c.json({
      success: true,
      data: {
        id: newId,
        page_id: page.id,
        block_type: source.block_type,
        title: source.title,
        data: JSON.parse(source.data as string),
        is_visible: !!source.is_visible,
        column_span: source.column_span ?? null,
        created_at: Math.floor(Date.now() / 1000),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to duplicate block' }, 500);
  }
});

/**
 * DELETE /api/blocks/:id — delete block, auto-remove from section_order
 */
blockRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('id');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id, section_order FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string; section_order: string | null }>();

    if (!page) return c.json({ success: false, error: 'No page found' }, 404);

    // Verify block belongs to this page
    const block = await c.env.DB.prepare(
      'SELECT id FROM content_blocks WHERE id = ? AND page_id = ?'
    ).bind(blockId, page.id).first();

    if (!block) return c.json({ success: false, error: 'Block not found' }, 404);

    await c.env.DB.prepare(
      'DELETE FROM content_blocks WHERE id = ?'
    ).bind(blockId).run();

    // Remove from section_order
    const currentOrder: string[] = page.section_order
      ? JSON.parse(page.section_order)
      : ['social_links', 'links'];
    const newOrder = currentOrder.filter((entry) => entry !== `block:${blockId}`);

    await c.env.DB.prepare(
      'UPDATE bio_pages SET section_order = ? WHERE id = ?'
    ).bind(JSON.stringify(newOrder), page.id).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete block' }, 500);
  }
});

/**
 * POST /api/blocks/upload — upload file to R2 (images, downloads)
 */
blockRoutes.post('/upload', async (c) => {
  const user = c.get('user');

  try {
    const formData = await c.req.formData();
    const raw = formData.get('file');

    if (!raw || typeof raw === 'string') {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    const file = raw as File;

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'File must be under 10MB' }, 400);
    }

    const ext = file.name.split('.').pop() || 'bin';
    const r2Key = `blocks/${user.id}/${crypto.randomUUID()}.${ext}`;

    await c.env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    return c.json({
      success: true,
      data: {
        r2_key: r2Key,
        filename: file.name,
        file_size: file.size,
        url: `/api/public/file/${r2Key}`,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});
