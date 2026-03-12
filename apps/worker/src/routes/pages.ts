import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { generateAccessToken } from '../utils/crypto';

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

    // updated_at is maintained by bio_pages_updated_at trigger
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
    email_label?: string;
    secondary_email?: string;
    secondary_email_label?: string;
    show_email_page?: boolean;
    show_email_card?: boolean;
    show_secondary_email_page?: boolean;
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
    if (body.email_label !== undefined) {
      updates.push('email_label = ?');
      values.push(body.email_label || null);
    }
    if (body.secondary_email !== undefined) {
      updates.push('secondary_email = ?');
      values.push(body.secondary_email || null);
    }
    if (body.secondary_email_label !== undefined) {
      updates.push('secondary_email_label = ?');
      values.push(body.secondary_email_label || null);
    }
    for (const toggle of [
      'show_email_page', 'show_email_card', 'show_secondary_email_page',
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

    // updated_at is maintained by bio_pages_updated_at trigger
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

    // Auto-seed a default card from existing show_*_card toggles (INSERT OR IGNORE prevents race-condition duplicates)
    if (cards.results.length === 0) {
      const id = crypto.randomUUID();
      const token = generateAccessToken();
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO business_cards (id, page_id, label, order_num, show_avatar, show_job_title, show_bio, show_email, show_phone, show_company, show_address, show_socials, access_token)
         VALUES (?, ?, 'My Card', 0, 1, 1, 0, ?, ?, ?, ?, 1, ?)`
      ).bind(
        id,
        page.id,
        page.show_email_card ? 1 : 0,
        page.show_phone_card ? 1 : 0,
        page.show_company_card ? 1 : 0,
        page.show_address_card ? 1 : 0,
        token,
      ).run();

      cards = await c.env.DB.prepare(
        'SELECT * FROM business_cards WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all();
    }

    // Backfill access tokens for any cards that don't have one yet
    const needTokens = cards.results.filter((row) => !row.access_token);
    if (needTokens.length > 0) {
      await Promise.all(
        needTokens.map((row) => {
          const token = generateAccessToken();
          return c.env.DB.prepare(
            'UPDATE business_cards SET access_token = ? WHERE id = ?'
          ).bind(token, row.id).run();
        })
      );
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
    const token = generateAccessToken();

    // Cards 2+ get a snapshot of current profile values as their initial overrides
    const pageData = await c.env.DB.prepare(
      'SELECT display_name, bio, job_title, profession, phone, company_name, address, email_label, secondary_email, secondary_email_label FROM bio_pages WHERE id = ?'
    ).bind(page.id).first<Record<string, string | null>>();

    const ownerRow = await c.env.DB.prepare(
      'SELECT email FROM users WHERE id = ?'
    ).bind(user.id).first<{ email: string }>();

    await c.env.DB.prepare(
      `INSERT INTO business_cards (id, page_id, label, order_num, show_avatar, show_job_title, show_bio, show_email, show_secondary_email, show_phone, show_company, show_address, show_socials, access_token,
       override_display_name, override_bio, override_job_title, override_profession, override_phone, override_company_name, override_address, override_email, override_email_label, override_secondary_email, override_secondary_email_label)
       VALUES (?, ?, ?, ?, 1, 1, 0, 1, 0, 1, 1, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, page.id, `Card ${orderNum + 1}`, orderNum, token,
      pageData?.display_name ?? null,
      pageData?.bio ?? null,
      pageData?.job_title ?? null,
      pageData?.profession ?? null,
      pageData?.phone ?? null,
      pageData?.company_name ?? null,
      pageData?.address ?? null,
      ownerRow?.email ?? null,
      pageData?.email_label ?? null,
      pageData?.secondary_email ?? null,
      pageData?.secondary_email_label ?? null,
    ).run();

    const card = await c.env.DB.prepare(
      'SELECT * FROM business_cards WHERE id = ?'
    ).bind(id).first();

    if (!card) {
      return c.json({ success: false, error: 'Failed to create card' }, 500);
    }

    return c.json({ success: true, data: { card: toBooleanCard(card) } });
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
    show_secondary_email?: boolean;
    show_phone?: boolean;
    show_company?: boolean;
    show_address?: boolean;
    show_socials?: boolean;
    override_display_name?: string | null;
    override_bio?: string | null;
    override_job_title?: string | null;
    override_profession?: string | null;
    override_phone?: string | null;
    override_company_name?: string | null;
    override_address?: string | null;
    override_email?: string | null;
    override_email_label?: string | null;
    override_secondary_email?: string | null;
    override_secondary_email_label?: string | null;
  }>();

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    // Verify card belongs to this user's page — include order_num for primary card detection
    const card = await c.env.DB.prepare(
      'SELECT id, order_num FROM business_cards WHERE id = ? AND page_id = ?'
    ).bind(cardId, page.id).first<{ id: string; order_num: number }>();

    if (!card) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    // Input validation
    if (body.label !== undefined) {
      if (typeof body.label !== 'string' || body.label.length === 0 || body.label.length > 100) {
        return c.json({ success: false, error: 'Label must be 1–100 characters' }, 400);
      }
    }
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.label !== undefined) {
      updates.push('label = ?');
      values.push(body.label);
    }
    for (const toggle of [
      'show_avatar', 'show_job_title', 'show_bio', 'show_email', 'show_secondary_email',
      'show_phone', 'show_company', 'show_address', 'show_socials',
    ] as const) {
      if (body[toggle] !== undefined) {
        updates.push(`${toggle} = ?`);
        values.push(body[toggle] ? 1 : 0);
      }
    }

    // Handle override fields based on card type
    const overrideFields = [
      'override_display_name', 'override_bio', 'override_job_title',
      'override_profession', 'override_phone', 'override_company_name',
      'override_address', 'override_email', 'override_email_label',
      'override_secondary_email', 'override_secondary_email_label',
    ] as const;

    // Map override field names to bio_pages column names for Card 1 write-through
    const bioFieldMap: Record<string, string> = {
      override_display_name: 'display_name',
      override_bio: 'bio',
      override_job_title: 'job_title',
      override_profession: 'profession',
      override_phone: 'phone',
      override_company_name: 'company_name',
      override_address: 'address',
      override_email_label: 'email_label',
      override_secondary_email: 'secondary_email',
      override_secondary_email_label: 'secondary_email_label',
    };

    if (card.order_num === 0) {
      // Card 1: write-through to bio_pages (override columns stay NULL)
      const bioUpdates: string[] = [];
      const bioValues: unknown[] = [];
      for (const field of overrideFields) {
        if ((body as Record<string, unknown>)[field] !== undefined) {
          const bioCol = bioFieldMap[field];
          if (bioCol) {
            bioUpdates.push(`${bioCol} = ?`);
            bioValues.push((body as Record<string, unknown>)[field]);
          }
          // override_email for Card 1 is ignored (email lives on users table)
        }
      }
      if (bioUpdates.length > 0) {
        bioValues.push(page.id);
        // updated_at is maintained by bio_pages_updated_at trigger
        await c.env.DB.prepare(
          `UPDATE bio_pages SET ${bioUpdates.join(', ')} WHERE id = ?`
        ).bind(...bioValues).run();
      }
    } else {
      // Cards 2+: write to the override columns on business_cards
      for (const field of overrideFields) {
        if ((body as Record<string, unknown>)[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push((body as Record<string, unknown>)[field]);
        }
      }
    }

    if (updates.length === 0) {
      return c.json({ success: true });
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

    // Fetch card to get its order_num, and verify it belongs to this page
    const card = await c.env.DB.prepare(
      'SELECT id, order_num FROM business_cards WHERE id = ? AND page_id = ?'
    ).bind(cardId, page.id).first<{ id: string; order_num: number }>();

    if (!card) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM business_cards WHERE page_id = ?'
    ).bind(page.id).first<{ cnt: number }>();

    if (count && count.cnt <= 1) {
      return c.json({ success: false, error: 'Cannot delete your only card' }, 400);
    }

    // Card 1 (primary / profile-synced) cannot be deleted
    if (card.order_num === 0) {
      return c.json({ success: false, error: 'Cannot delete your primary card' }, 400);
    }

    // Delete + re-normalize in a batch for atomicity
    await c.env.DB.batch([
      c.env.DB.prepare(
        'DELETE FROM business_cards WHERE id = ? AND page_id = ?'
      ).bind(cardId, page.id),
      c.env.DB.prepare(
        'UPDATE business_cards SET order_num = order_num - 1 WHERE page_id = ? AND order_num > ?'
      ).bind(page.id, card.order_num),
    ]);

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete card' }, 500);
  }
});

/**
 * POST /api/pages/me/cards/:cardId/regenerate-token — revoke old link, issue new one
 */
pageRoutes.post('/me/cards/:cardId/regenerate-token', async (c) => {
  const user = c.get('user');
  const cardId = c.req.param('cardId');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE user_id = ?'
    ).bind(user.id).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'No page found' }, 404);
    }

    const card = await c.env.DB.prepare(
      'SELECT id FROM business_cards WHERE id = ? AND page_id = ?'
    ).bind(cardId, page.id).first();

    if (!card) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const newToken = generateAccessToken();
    await c.env.DB.prepare(
      'UPDATE business_cards SET access_token = ? WHERE id = ?'
    ).bind(newToken, cardId).run();

    return c.json({ success: true, data: { access_token: newToken } });
  } catch {
    return c.json({ success: false, error: 'Failed to regenerate token' }, 500);
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
    show_secondary_email: !!row.show_secondary_email,
    show_phone: !!row.show_phone,
    show_company: !!row.show_company,
    show_address: !!row.show_address,
    show_socials: !!row.show_socials,
  };
}
