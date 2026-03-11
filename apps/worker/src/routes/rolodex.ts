import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const rolodexRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

rolodexRoutes.use('*', authMiddleware);

/** Helper: get user's page */
async function getPage(db: D1Database, userId: string) {
  return db.prepare('SELECT * FROM bio_pages WHERE user_id = ?').bind(userId).first();
}

/** Build a ContactSnapshot from a public page row */
async function buildContactSnapshot(db: D1Database, page: Record<string, unknown>) {
  const [owner, socialLinks, cards] = await Promise.all([
    db.prepare('SELECT email FROM users WHERE id = ?').bind(page.user_id).first<{ email: string }>(),
    db.prepare('SELECT platform, url FROM social_links WHERE page_id = ? ORDER BY order_num').bind(page.id).all(),
    db.prepare('SELECT * FROM business_cards WHERE page_id = ? ORDER BY order_num LIMIT 1').bind(page.id).all(),
  ]);

  const card = cards.results[0] as Record<string, unknown> | undefined;
  const showEmail = card ? !!card.show_email : !!page.show_email_card;
  const showPhone = card ? !!card.show_phone : !!page.show_phone_card;
  const showCompany = card ? !!card.show_company : !!page.show_company_card;
  const showAddress = card ? !!card.show_address : !!page.show_address_card;

  let theme: Record<string, unknown> = {};
  try { theme = JSON.parse(page.theme as string); } catch { /* empty */ }

  return {
    display_name: (page.display_name as string) || null,
    bio: (page.bio as string) || null,
    job_title: (page.job_title as string) || null,
    avatar_r2_key: (page.avatar_r2_key as string) || null,
    company_name: showCompany ? (page.company_name as string) || null : null,
    phone: showPhone ? (page.phone as string) || null : null,
    address: showAddress ? (page.address as string) || null : null,
    email: showEmail ? (owner?.email || null) : null,
    theme,
    social_links: socialLinks.results.map((s: Record<string, unknown>) => ({
      platform: s.platform as string,
      url: s.url as string,
    })),
  };
}

/** Background: refresh stale rolodex entries (>12h old) */
async function refreshStaleEntries(db: D1Database, entries: Record<string, unknown>[]) {
  for (const entry of entries.slice(0, 10)) {
    try {
      const contactPage = await db.prepare(
        'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
      ).bind(entry.contact_username).first();
      if (!contactPage) continue;

      const snapshot = await buildContactSnapshot(db, contactPage);
      await db.prepare(
        "UPDATE rolodex_entries SET contact_snapshot = ?, contact_page_id = ?, last_refreshed_at = datetime('now') WHERE id = ?"
      ).bind(JSON.stringify(snapshot), contactPage.id as string, entry.id as string).run();
    } catch { /* non-critical */ }
  }
}

/**
 * GET /api/rolodex — list all rolodex entries (with lazy background refresh)
 */
rolodexRoutes.get('/', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const entries = await c.env.DB.prepare(
    'SELECT * FROM rolodex_entries WHERE owner_page_id = ? ORDER BY saved_at DESC'
  ).bind(page.id).all();

  // Lazy refresh: entries older than 12 hours get refreshed in the background
  const staleThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const staleEntries = entries.results.filter(
    (e) => (e.last_refreshed_at as string) < staleThreshold
  );
  if (staleEntries.length > 0) {
    c.executionCtx.waitUntil(refreshStaleEntries(c.env.DB, staleEntries));
  }

  return c.json({
    success: true,
    data: {
      entries: entries.results.map((e) => ({
        ...e,
        contact_snapshot: JSON.parse(e.contact_snapshot as string),
      })),
    },
  });
});

/**
 * POST /api/rolodex — add a contact to your rolodex (from scanning)
 */
rolodexRoutes.post('/', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const { username } = await c.req.json<{ username: string }>();
  if (!username || typeof username !== 'string') {
    return c.json({ success: false, error: 'username is required' }, 400);
  }

  const contactPage = await c.env.DB.prepare(
    'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
  ).bind(username).first();

  if (!contactPage) return c.json({ success: false, error: 'User not found' }, 404);
  if (contactPage.id === page.id) return c.json({ success: false, error: 'Cannot add yourself' }, 400);

  // Check limit (max 200 rolodex entries)
  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM rolodex_entries WHERE owner_page_id = ?'
  ).bind(page.id).first<{ cnt: number }>();
  if (count && count.cnt >= 200) {
    return c.json({ success: false, error: 'Rolodex is full (max 200 contacts)' }, 400);
  }

  const snapshot = await buildContactSnapshot(c.env.DB, contactPage);
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO rolodex_entries (id, owner_page_id, contact_username, contact_page_id, contact_snapshot)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, page.id, username, contactPage.id as string, JSON.stringify(snapshot)).run();

  return c.json({
    success: true,
    data: {
      entry: {
        id,
        owner_page_id: page.id,
        contact_username: username,
        contact_page_id: contactPage.id,
        contact_snapshot: snapshot,
        notes: '',
        saved_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
      },
    },
  });
});

/**
 * PUT /api/rolodex/:id — update notes on a rolodex entry
 */
rolodexRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const entryId = c.req.param('id');
  const { notes } = await c.req.json<{ notes: string }>();

  if (typeof notes !== 'string' || notes.length > 500) {
    return c.json({ success: false, error: 'Notes must be 0–500 characters' }, 400);
  }

  const result = await c.env.DB.prepare(
    'UPDATE rolodex_entries SET notes = ? WHERE id = ? AND owner_page_id = ?'
  ).bind(notes, entryId, page.id).run();

  if (!result.meta.changes) return c.json({ success: false, error: 'Entry not found' }, 404);
  return c.json({ success: true });
});

/**
 * DELETE /api/rolodex/:id — remove a contact from your rolodex
 */
rolodexRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const entryId = c.req.param('id');
  await c.env.DB.prepare(
    'DELETE FROM rolodex_entries WHERE id = ? AND owner_page_id = ?'
  ).bind(entryId, page.id).run();

  return c.json({ success: true });
});

/**
 * POST /api/rolodex/:id/refresh — manually refresh a single contact's snapshot
 */
rolodexRoutes.post('/:id/refresh', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const entryId = c.req.param('id');
  const entry = await c.env.DB.prepare(
    'SELECT * FROM rolodex_entries WHERE id = ? AND owner_page_id = ?'
  ).bind(entryId, page.id).first();

  if (!entry) return c.json({ success: false, error: 'Entry not found' }, 404);

  const contactPage = await c.env.DB.prepare(
    'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
  ).bind(entry.contact_username).first();

  if (!contactPage) return c.json({ success: false, error: 'Contact page no longer exists' }, 404);

  const snapshot = await buildContactSnapshot(c.env.DB, contactPage);
  await c.env.DB.prepare(
    "UPDATE rolodex_entries SET contact_snapshot = ?, contact_page_id = ?, last_refreshed_at = datetime('now') WHERE id = ?"
  ).bind(JSON.stringify(snapshot), contactPage.id as string, entryId).run();

  return c.json({ success: true, data: { contact_snapshot: snapshot } });
});

/**
 * GET /api/rolodex/exchanges — list incoming pending exchange requests
 */
rolodexRoutes.get('/exchanges', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  // Only return non-expired pending exchanges
  const exchanges = await c.env.DB.prepare(
    `SELECT * FROM card_exchanges
     WHERE to_page_id = ? AND status = 'pending' AND expires_at > datetime('now')
     ORDER BY created_at DESC`
  ).bind(page.id).all();

  // Clean up expired exchanges in the background
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "UPDATE card_exchanges SET status = 'declined' WHERE to_page_id = ? AND status = 'pending' AND expires_at <= datetime('now')"
    ).bind(page.id).run().catch(() => {})
  );

  return c.json({
    success: true,
    data: {
      exchanges: exchanges.results.map((e) => ({
        ...e,
        card_snapshot: JSON.parse(e.card_snapshot as string),
      })),
    },
  });
});

/**
 * GET /api/rolodex/exchanges/count — pending exchange count (for badge)
 */
rolodexRoutes.get('/exchanges/count', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM card_exchanges WHERE to_page_id = ? AND status = 'pending' AND expires_at > datetime('now')"
  ).bind(page.id).first<{ cnt: number }>();

  return c.json({ success: true, data: { count: result?.cnt ?? 0 } });
});

/**
 * POST /api/rolodex/exchanges — send your card to another user
 */
rolodexRoutes.post('/exchanges', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const { to_username } = await c.req.json<{ to_username: string }>();
  if (!to_username || typeof to_username !== 'string') {
    return c.json({ success: false, error: 'to_username is required' }, 400);
  }

  const toPage = await c.env.DB.prepare(
    'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
  ).bind(to_username).first();

  if (!toPage) return c.json({ success: false, error: 'User not found' }, 404);
  if (toPage.id === page.id) return c.json({ success: false, error: 'Cannot send to yourself' }, 400);

  // Check if exchange already exists
  const existing = await c.env.DB.prepare(
    'SELECT id, status FROM card_exchanges WHERE from_page_id = ? AND to_page_id = ?'
  ).bind(page.id, toPage.id).first<{ id: string; status: string }>();

  if (existing) {
    if (existing.status === 'pending') return c.json({ success: true, data: { status: 'pending', message: 'Already sent' } });
    if (existing.status === 'accepted') return c.json({ success: true, data: { status: 'accepted', message: 'Already accepted' } });
    // If declined, allow re-sending by updating
    await c.env.DB.prepare('DELETE FROM card_exchanges WHERE id = ?').bind(existing.id).run();
  }

  const mySnapshot = await buildContactSnapshot(c.env.DB, page);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const autoAccept = !!toPage.auto_accept_cards;

  if (autoAccept) {
    const rolodexId = crypto.randomUUID();
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO card_exchanges (id, from_page_id, from_username, to_page_id, to_username, status, card_snapshot, expires_at, responded_at)
         VALUES (?, ?, ?, ?, ?, 'accepted', ?, ?, datetime('now'))`
      ).bind(id, page.id, page.username, toPage.id, to_username, JSON.stringify(mySnapshot), expiresAt),
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO rolodex_entries (id, owner_page_id, contact_username, contact_page_id, contact_snapshot)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(rolodexId, toPage.id, page.username, page.id, JSON.stringify(mySnapshot)),
    ]);
    return c.json({ success: true, data: { status: 'accepted' } });
  }

  await c.env.DB.prepare(
    `INSERT INTO card_exchanges (id, from_page_id, from_username, to_page_id, to_username, status, card_snapshot, expires_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(id, page.id, page.username, toPage.id, to_username, JSON.stringify(mySnapshot), expiresAt).run();

  return c.json({ success: true, data: { status: 'pending' } });
});

/**
 * PUT /api/rolodex/exchanges/:id — accept or decline an exchange request
 */
rolodexRoutes.put('/exchanges/:id', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  const exchangeId = c.req.param('id');
  const { action } = await c.req.json<{ action: 'accept' | 'decline' }>();

  if (!['accept', 'decline'].includes(action)) {
    return c.json({ success: false, error: 'action must be "accept" or "decline"' }, 400);
  }

  const exchange = await c.env.DB.prepare(
    "SELECT * FROM card_exchanges WHERE id = ? AND to_page_id = ? AND status = 'pending'"
  ).bind(exchangeId, page.id).first();

  if (!exchange) return c.json({ success: false, error: 'Exchange not found or already resolved' }, 404);

  if (action === 'accept') {
    const rolodexId = crypto.randomUUID();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE card_exchanges SET status = 'accepted', responded_at = datetime('now') WHERE id = ?"
      ).bind(exchangeId),
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO rolodex_entries (id, owner_page_id, contact_username, contact_page_id, contact_snapshot)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(rolodexId, page.id, exchange.from_username, exchange.from_page_id, exchange.card_snapshot),
    ]);
  } else {
    await c.env.DB.prepare(
      "UPDATE card_exchanges SET status = 'declined', responded_at = datetime('now') WHERE id = ?"
    ).bind(exchangeId).run();
  }

  return c.json({ success: true });
});

/**
 * PUT /api/rolodex/auto-accept — toggle auto-accept setting
 */
rolodexRoutes.put('/auto-accept', async (c) => {
  const user = c.get('user');
  const { enabled } = await c.req.json<{ enabled: boolean }>();

  await c.env.DB.prepare(
    'UPDATE bio_pages SET auto_accept_cards = ? WHERE user_id = ?'
  ).bind(enabled ? 1 : 0, user.id).run();

  return c.json({ success: true });
});

/**
 * GET /api/rolodex/auto-accept — get auto-accept setting
 */
rolodexRoutes.get('/auto-accept', async (c) => {
  const user = c.get('user');
  const page = await getPage(c.env.DB, user.id);
  if (!page) return c.json({ success: false, error: 'No page found' }, 404);

  return c.json({ success: true, data: { enabled: !!page.auto_accept_cards } });
});
