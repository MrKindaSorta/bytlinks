import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const pageRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

pageRoutes.use('*', authMiddleware);

/**
 * POST /api/pages/avatar — upload avatar image to R2
 */
pageRoutes.post('/avatar', async (c) => {
  const user = c.get('user');

  try {
    const formData = await c.req.formData();
    const raw = formData.get('file');

    if (!raw || typeof raw === 'string') {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    const file = raw as File;

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File must be under 5MB' }, 400);
    }

    if (!file.type.startsWith('image/')) {
      return c.json({ success: false, error: 'File must be an image' }, 400);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const r2Key = `avatars/${user.id}.${ext}`;

    await c.env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    await c.env.DB.prepare(
      'UPDATE bio_pages SET avatar_r2_key = ? WHERE user_id = ?'
    ).bind(r2Key, user.id).run();

    return c.json({
      success: true,
      data: { avatar_url: `/api/public/avatar/${r2Key}` },
    });
  } catch {
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

/**
 * GET /api/pages/me — fetch the current user's bio page + links + socials
 */
pageRoutes.get('/me', async (c) => {
  const user = c.get('user');

  try {
    const page = await c.env.DB.prepare(
      'SELECT * FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    const [links, socialLinks, embeds, blocks] = await Promise.all([
      c.env.DB.prepare(
        'SELECT * FROM links WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM social_links WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM embed_blocks WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM content_blocks WHERE page_id = ? ORDER BY created_at'
      ).bind(page.id).all(),
    ]);

    const sectionOrder = page.section_order
      ? JSON.parse(page.section_order as string)
      : null;

    return c.json({
      success: true,
      data: {
        page: { ...page, theme: JSON.parse(page.theme as string), section_order: sectionOrder },
        links: links.results,
        socialLinks: socialLinks.results,
        embeds: embeds.results,
        blocks: blocks.results.map((b: Record<string, unknown>) => ({
          ...b,
          data: JSON.parse(b.data as string),
          is_visible: !!b.is_visible,
        })),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load page' }, 500);
  }
});

/**
 * PUT /api/pages/me — update the bio page (display_name, bio, theme, etc.)
 */
pageRoutes.put('/me', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    display_name?: string;
    bio?: string;
    about_me?: string;
    about_me_expanded?: boolean;
    theme?: Record<string, unknown>;
    show_branding?: boolean;
    section_order?: string[];
    job_title?: string;
    profession?: string;
  }>();

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(body.display_name);
    }
    if (body.bio !== undefined) {
      updates.push('bio = ?');
      values.push(body.bio);
    }
    if (body.about_me !== undefined) {
      updates.push('about_me = ?');
      values.push(body.about_me);
    }
    if (body.about_me_expanded !== undefined) {
      updates.push('about_me_expanded = ?');
      values.push(body.about_me_expanded ? 1 : 0);
    }
    if (body.theme !== undefined) {
      updates.push('theme = ?');
      values.push(JSON.stringify(body.theme));
    }
    if (body.show_branding !== undefined) {
      updates.push('show_branding = ?');
      values.push(body.show_branding ? 1 : 0);
    }
    if (body.section_order !== undefined) {
      updates.push('section_order = ?');
      values.push(JSON.stringify(body.section_order));
    }
    if (body.job_title !== undefined) {
      updates.push('job_title = ?');
      values.push(body.job_title);
    }
    if (body.profession !== undefined) {
      updates.push('profession = ?');
      values.push(body.profession);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(page.id);

    await c.env.DB.prepare(
      `UPDATE bio_pages SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update page' }, 500);
  }
});
