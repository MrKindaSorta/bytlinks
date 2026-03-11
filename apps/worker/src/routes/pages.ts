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
    phone?: string;
    company_name?: string;
    address?: string;
    show_email_page?: boolean;
    show_email_card?: boolean;
    show_phone_page?: boolean;
    show_phone_card?: boolean;
    show_company_page?: boolean;
    show_company_card?: boolean;
    show_address_page?: boolean;
    show_address_card?: boolean;
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
    if (body.phone !== undefined) {
      updates.push('phone = ?');
      values.push(body.phone);
    }
    if (body.company_name !== undefined) {
      updates.push('company_name = ?');
      values.push(body.company_name);
    }
    if (body.address !== undefined) {
      updates.push('address = ?');
      values.push(body.address);
    }
    for (const toggle of [
      'show_email_page', 'show_email_card',
      'show_phone_page', 'show_phone_card',
      'show_company_page', 'show_company_card',
      'show_address_page', 'show_address_card',
    ] as const) {
      if (body[toggle] !== undefined) {
        updates.push(`${toggle} = ?`);
        values.push(body[toggle] ? 1 : 0);
      }
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

/**
 * GET /api/pages/me/cards — list business cards (auto-seeds a default if none exist)
 */
pageRoutes.get('/me/cards', async (c) => {
  const user = c.get('user');

  try {
    const page = await c.env.DB.prepare(
      'SELECT * FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    let cards = await c.env.DB.prepare(
      'SELECT * FROM business_cards WHERE page_id = ? ORDER BY order_num'
    ).bind(page.id).all();

    // Auto-seed a default card from existing show_*_card toggles
    if (cards.results.length === 0) {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO business_cards (id, page_id, label, order_num, show_avatar, show_job_title, show_bio, show_email, show_phone, show_company, show_address, show_socials, qr_target)
         VALUES (?, ?, 'My Card', 0, 1, 1, 0, ?, ?, ?, ?, 1, 'card')`
      ).bind(
        id,
        page.id,
        page.show_email_card ? 1 : 0,
        page.show_phone_card ? 1 : 0,
        page.show_company_card ? 1 : 0,
        page.show_address_card ? 1 : 0,
      ).run();

      cards = await c.env.DB.prepare(
        'SELECT * FROM business_cards WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all();
    }

    return c.json({
      success: true,
      data: { cards: cards.results.map(toBooleanCard) },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load cards' }, 500);
  }
});

/**
 * POST /api/pages/me/cards — create a new business card (max 3)
 */
pageRoutes.post('/me/cards', async (c) => {
  const user = c.get('user');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM business_cards WHERE page_id = ?'
    ).bind(page.id).first<{ cnt: number }>();

    if (count && count.cnt >= 3) {
      return c.json({ success: false, error: 'Maximum of 3 cards allowed' }, 400);
    }

    const id = crypto.randomUUID();
    const orderNum = count ? count.cnt : 0;

    await c.env.DB.prepare(
      `INSERT INTO business_cards (id, page_id, label, order_num, show_avatar, show_job_title, show_bio, show_email, show_phone, show_company, show_address, show_socials, qr_target)
       VALUES (?, ?, ?, ?, 1, 1, 0, 1, 1, 1, 1, 1, 'card')`
    ).bind(id, page.id, `Card ${orderNum + 1}`, orderNum).run();

    const card = await c.env.DB.prepare(
      'SELECT * FROM business_cards WHERE id = ?'
    ).bind(id).first();

    return c.json({ success: true, data: { card: toBooleanCard(card!) } });
  } catch {
    return c.json({ success: false, error: 'Failed to create card' }, 500);
  }
});

/**
 * PUT /api/pages/me/cards/:cardId — update a business card
 */
pageRoutes.put('/me/cards/:cardId', async (c) => {
  const user = c.get('user');
  const cardId = c.req.param('cardId');
  const body = await c.req.json<{
    label?: string;
    show_avatar?: boolean;
    show_job_title?: boolean;
    show_bio?: boolean;
    show_email?: boolean;
    show_phone?: boolean;
    show_company?: boolean;
    show_address?: boolean;
    show_socials?: boolean;
    qr_target?: 'card' | 'profile';
  }>();

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    // Verify card belongs to this user's page
    const card = await c.env.DB.prepare(
      'SELECT id FROM business_cards WHERE id = ? AND page_id = ?'
    ).bind(cardId, page.id).first();

    if (!card) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.label !== undefined) {
      updates.push('label = ?');
      values.push(body.label);
    }
    if (body.qr_target !== undefined) {
      updates.push('qr_target = ?');
      values.push(body.qr_target);
    }
    for (const toggle of [
      'show_avatar', 'show_job_title', 'show_bio', 'show_email',
      'show_phone', 'show_company', 'show_address', 'show_socials',
    ] as const) {
      if (body[toggle] !== undefined) {
        updates.push(`${toggle} = ?`);
        values.push(body[toggle] ? 1 : 0);
      }
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(cardId);
    await c.env.DB.prepare(
      `UPDATE business_cards SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update card' }, 500);
  }
});

/**
 * DELETE /api/pages/me/cards/:cardId — delete a business card (must keep at least 1)
 */
pageRoutes.delete('/me/cards/:cardId', async (c) => {
  const user = c.get('user');
  const cardId = c.req.param('cardId');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM business_cards WHERE page_id = ?'
    ).bind(page.id).first<{ cnt: number }>();

    if (count && count.cnt <= 1) {
      return c.json({ success: false, error: 'Cannot delete your only card' }, 400);
    }

    await c.env.DB.prepare(
      'DELETE FROM business_cards WHERE id = ? AND page_id = ?'
    ).bind(cardId, page.id).run();

    // Re-normalize order_num
    const remaining = await c.env.DB.prepare(
      'SELECT id FROM business_cards WHERE page_id = ? ORDER BY order_num'
    ).bind(page.id).all();

    for (let i = 0; i < remaining.results.length; i++) {
      await c.env.DB.prepare(
        'UPDATE business_cards SET order_num = ? WHERE id = ?'
      ).bind(i, remaining.results[i].id).run();
    }

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete card' }, 500);
  }
});

/** Convert SQLite integer booleans to JS booleans for a business card row */
function toBooleanCard(row: Record<string, unknown>) {
  return {
    ...row,
    show_avatar: !!row.show_avatar,
    show_job_title: !!row.show_job_title,
    show_bio: !!row.show_bio,
    show_email: !!row.show_email,
    show_phone: !!row.show_phone,
    show_company: !!row.show_company,
    show_address: !!row.show_address,
    show_socials: !!row.show_socials,
  };
}
