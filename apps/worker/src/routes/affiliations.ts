import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { generateAccessToken } from '../utils/crypto';
import { checkRateLimit } from '../utils/rateLimit';
import { sendEmail, buildAffiliationRequestEmail } from '../utils/email';

export const affiliationsRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser };
}>();

affiliationsRoutes.use('*', authMiddleware);

// ── Helpers ──

/** SHA-256 hash a string and return hex. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Strip HTML tags from a string. */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Generate a short human-readable invite code: [3-letter prefix]-[4 random alphanumeric]. */
function generateInviteCode(businessName: string): string {
  const prefix = businessName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const suffix = generateAccessToken().toUpperCase().slice(0, 4);
  return `${prefix}-${suffix}`;
}

/** Touch the updated_at timestamp on an affiliation row. */
async function touchAffiliation(db: D1Database, affiliationId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    'UPDATE page_affiliations SET updated_at = ? WHERE id = ?'
  ).bind(now, affiliationId).run();
}

/** Verify the authenticated user owns a given page. Returns the page or null. */
async function verifyPageOwnership(
  db: D1Database,
  pageId: string,
  userId: string,
): Promise<{ id: string; user_id: string; display_name: string | null; username: string } | null> {
  const page = await db.prepare(
    'SELECT id, user_id, display_name, username FROM bio_pages WHERE id = ? AND user_id = ?'
  ).bind(pageId, userId).first<{ id: string; user_id: string; display_name: string | null; username: string }>();
  return page || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS-SIDE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/affiliations/invite/create
 * Generate an invite code + link for a business page.
 */
affiliationsRoutes.post('/invite/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    business_page_id: string;
    max_uses?: number;
    expires_in_days?: number;
  }>();

  if (!body.business_page_id) {
    return c.json({ success: false, error: 'business_page_id is required' }, 400);
  }

  const page = await verifyPageOwnership(c.env.DB, body.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Page not found or not owned by you' }, 403);
  }

  const businessName = page.display_name || page.username || 'BYT';

  // Generate code with retry on collision (up to 3 attempts)
  let code = '';
  let codeInserted = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    code = generateInviteCode(businessName);
    const existing = await c.env.DB.prepare(
      'SELECT id FROM affiliation_invites WHERE code = ?'
    ).bind(code).first();
    if (!existing) {
      codeInserted = true;
      break;
    }
  }
  if (!codeInserted) {
    return c.json({ success: false, error: 'Failed to generate unique code. Please try again.' }, 500);
  }

  // Generate full token for invite link
  const rawToken = generateAccessToken();
  const tokenHash = await sha256Hex(rawToken);

  const expiresAt = body.expires_in_days
    ? Math.floor(Date.now() / 1000) + body.expires_in_days * 86400
    : null;

  const inviteId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO affiliation_invites (id, business_page_id, code, token_hash, created_by, max_uses, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    inviteId,
    body.business_page_id,
    code,
    tokenHash,
    user.id,
    body.max_uses ?? null,
    expiresAt,
  ).run();

  return c.json({
    success: true,
    data: {
      invite_id: inviteId,
      code,
      invite_url: `https://www.bytlinks.com/join/${rawToken}`,
    },
  });
});

/**
 * GET /api/affiliations/invites/:businessPageId
 * List all invites for a business page.
 */
affiliationsRoutes.get('/invites/:businessPageId', async (c) => {
  const user = c.get('user');
  const businessPageId = c.req.param('businessPageId');

  const page = await verifyPageOwnership(c.env.DB, businessPageId, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Page not found or not owned by you' }, 403);
  }

  const invites = await c.env.DB.prepare(
    'SELECT id, code, max_uses, use_count, expires_at, is_active, created_at FROM affiliation_invites WHERE business_page_id = ? ORDER BY created_at DESC'
  ).bind(businessPageId).all();

  return c.json({
    success: true,
    data: {
      invites: (invites.results || []).map((inv: Record<string, unknown>) => ({
        id: inv.id,
        code: inv.code,
        maxUses: inv.max_uses,
        useCount: inv.use_count,
        expiresAt: inv.expires_at,
        isActive: !!inv.is_active,
        createdAt: inv.created_at,
      })),
    },
  });
});

/**
 * DELETE /api/affiliations/invite/:inviteId
 * Deactivate an invite.
 */
affiliationsRoutes.delete('/invite/:inviteId', async (c) => {
  const user = c.get('user');
  const inviteId = c.req.param('inviteId');

  // Verify ownership: invite → business_page → user
  const invite = await c.env.DB.prepare(
    'SELECT business_page_id FROM affiliation_invites WHERE id = ?'
  ).bind(inviteId).first<{ business_page_id: string }>();

  if (!invite) {
    return c.json({ success: false, error: 'Invite not found' }, 404);
  }

  const page = await verifyPageOwnership(c.env.DB, invite.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE affiliation_invites SET is_active = 0 WHERE id = ?'
  ).bind(inviteId).run();

  return c.json({ success: true });
});

/**
 * GET /api/affiliations/members/:businessPageId
 * List pending and active members for a business page.
 */
affiliationsRoutes.get('/members/:businessPageId', async (c) => {
  const user = c.get('user');
  const businessPageId = c.req.param('businessPageId');

  const page = await verifyPageOwnership(c.env.DB, businessPageId, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Page not found or not owned by you' }, 403);
  }

  const rows = await c.env.DB.prepare(
    `SELECT pa.id, pa.role_label, pa.status, pa.show_on_business_page, pa.created_at,
            bp.username, bp.display_name, bp.avatar_r2_key
     FROM page_affiliations pa
     JOIN bio_pages bp ON bp.id = pa.member_page_id
     WHERE pa.business_page_id = ? AND pa.status IN ('pending', 'active')
     ORDER BY pa.created_at DESC`
  ).bind(businessPageId).all();

  const members = (rows.results || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    avatarKey: r.avatar_r2_key,
    roleLabel: r.role_label,
    status: r.status,
    showOnBusinessPage: !!r.show_on_business_page,
    createdAt: r.created_at,
  }));

  return c.json({
    success: true,
    data: {
      pending: members.filter((m) => m.status === 'pending'),
      active: members.filter((m) => m.status === 'active'),
    },
  });
});

/**
 * POST /api/affiliations/approve/:affiliationId
 * Approve a pending affiliation request.
 */
affiliationsRoutes.post('/approve/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');

  const affiliation = await c.env.DB.prepare(
    'SELECT id, business_page_id, status FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; business_page_id: string; status: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }
  if (affiliation.status !== 'pending') {
    return c.json({ success: false, error: 'Affiliation is not pending' }, 400);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    "UPDATE page_affiliations SET status = 'active' WHERE id = ?"
  ).bind(affiliationId).run();
  await touchAffiliation(c.env.DB, affiliationId);

  return c.json({ success: true });
});

/**
 * POST /api/affiliations/reject/:affiliationId
 * Reject a pending affiliation request.
 */
affiliationsRoutes.post('/reject/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');

  const affiliation = await c.env.DB.prepare(
    'SELECT id, business_page_id, status FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; business_page_id: string; status: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }
  if (affiliation.status !== 'pending') {
    return c.json({ success: false, error: 'Affiliation is not pending' }, 400);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    "UPDATE page_affiliations SET status = 'rejected' WHERE id = ?"
  ).bind(affiliationId).run();
  await touchAffiliation(c.env.DB, affiliationId);

  return c.json({ success: true });
});

/**
 * DELETE /api/affiliations/remove/:affiliationId
 * Business removes an affiliation (pending or active).
 */
affiliationsRoutes.delete('/remove/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');

  const affiliation = await c.env.DB.prepare(
    'SELECT id, business_page_id FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; business_page_id: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    'DELETE FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).run();

  return c.json({ success: true });
});

/**
 * PATCH /api/affiliations/team-visibility
 * Toggle the "Meet Our Team" section on the business public page.
 */
affiliationsRoutes.patch('/team-visibility', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    business_page_id: string;
    show_team_section: boolean;
  }>();

  if (!body.business_page_id) {
    return c.json({ success: false, error: 'business_page_id is required' }, 400);
  }

  const page = await verifyPageOwnership(c.env.DB, body.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Page not found or not owned by you' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE bio_pages SET show_team_section = ? WHERE id = ?'
  ).bind(body.show_team_section ? 1 : 0, body.business_page_id).run();

  return c.json({ success: true });
});

/**
 * PATCH /api/affiliations/member-visibility/:affiliationId
 * Business toggles whether a member shows on the business page.
 */
affiliationsRoutes.patch('/member-visibility/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');
  const body = await c.req.json<{ show_on_business_page: boolean }>();

  const affiliation = await c.env.DB.prepare(
    'SELECT id, business_page_id FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; business_page_id: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.business_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE page_affiliations SET show_on_business_page = ? WHERE id = ?'
  ).bind(body.show_on_business_page ? 1 : 0, affiliationId).run();
  await touchAffiliation(c.env.DB, affiliationId);

  return c.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER-SIDE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/affiliations/join
 * Member joins a team using a short code or full invite token.
 */
affiliationsRoutes.post('/join', async (c) => {
  const user = c.get('user');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 10 join attempts per hour per IP
  const allowed = await checkRateLimit(c.env.DB, `affiliation-join:${ip}`, 10, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many join attempts. Try again later.' }, 429);
  }

  const body = await c.req.json<{
    code?: string;
    token?: string;
    member_page_id: string;
    role_label: string;
  }>();

  if (!body.member_page_id) {
    return c.json({ success: false, error: 'member_page_id is required' }, 400);
  }
  if (!body.code && !body.token) {
    return c.json({ success: false, error: 'Either code or token is required' }, 400);
  }

  // Validate role label
  const roleLabel = stripHtml((body.role_label || '').trim());
  if (!roleLabel || roleLabel.length > 40) {
    return c.json({ success: false, error: 'Role label is required (max 40 characters)' }, 400);
  }

  // Verify member owns the page
  const memberPage = await verifyPageOwnership(c.env.DB, body.member_page_id, user.id);
  if (!memberPage) {
    return c.json({ success: false, error: 'Page not found or not owned by you' }, 403);
  }

  // Find the invite — by short code or by hashed token
  let invite: Record<string, unknown> | null = null;
  if (body.token) {
    const tokenHash = await sha256Hex(body.token);
    invite = await c.env.DB.prepare(
      'SELECT * FROM affiliation_invites WHERE token_hash = ?'
    ).bind(tokenHash).first();
  } else if (body.code) {
    invite = await c.env.DB.prepare(
      'SELECT * FROM affiliation_invites WHERE code = ?'
    ).bind(body.code.toUpperCase().trim()).first();
  }

  if (!invite) {
    return c.json({ success: false, error: 'Invalid invite code' }, 404);
  }

  // Validate invite is usable
  if (!invite.is_active) {
    return c.json({ success: false, error: 'This invite has been deactivated' }, 410);
  }
  const now = Math.floor(Date.now() / 1000);
  if (invite.expires_at && (invite.expires_at as number) < now) {
    return c.json({ success: false, error: 'This invite has expired' }, 410);
  }
  if (invite.max_uses && (invite.use_count as number) >= (invite.max_uses as number)) {
    return c.json({ success: false, error: 'This invite has reached its usage limit' }, 410);
  }

  // Cannot affiliate with yourself
  const businessPageId = invite.business_page_id as string;
  if (businessPageId === body.member_page_id) {
    return c.json({ success: false, error: 'You cannot affiliate with your own page' }, 400);
  }

  // Check for existing affiliation (UNIQUE constraint)
  const existing = await c.env.DB.prepare(
    'SELECT id, status FROM page_affiliations WHERE business_page_id = ? AND member_page_id = ?'
  ).bind(businessPageId, body.member_page_id).first<{ id: string; status: string }>();

  if (existing) {
    if (existing.status === 'active') {
      return c.json({ success: false, error: 'You are already affiliated with this business' }, 409);
    }
    if (existing.status === 'pending') {
      return c.json({ success: false, error: 'You already have a pending request with this business' }, 409);
    }
    // If rejected, allow re-request: delete old row and create new
    await c.env.DB.prepare(
      'DELETE FROM page_affiliations WHERE id = ?'
    ).bind(existing.id).run();
  }

  // Create the affiliation
  const affiliationId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO page_affiliations (id, business_page_id, member_page_id, role_label, status, invited_by)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  ).bind(affiliationId, businessPageId, body.member_page_id, roleLabel, user.id).run();

  // Increment invite use count
  await c.env.DB.prepare(
    'UPDATE affiliation_invites SET use_count = use_count + 1 WHERE id = ?'
  ).bind(invite.id).run();

  // Look up business name for the response + email notification
  const businessPage = await c.env.DB.prepare(
    'SELECT display_name, username, user_id FROM bio_pages WHERE id = ?'
  ).bind(businessPageId).first<{ display_name: string | null; username: string; user_id: string }>();

  const businessName = businessPage?.display_name || businessPage?.username || 'Unknown';

  // Fire-and-forget: email notification to business owner
  if (c.env.RESEND_API_KEY && businessPage) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const owner = await c.env.DB.prepare(
            'SELECT email FROM users WHERE id = ?'
          ).bind(businessPage.user_id).first<{ email: string }>();
          if (owner?.email) {
            const requesterName = memberPage.display_name || memberPage.username || 'Someone';
            const email = buildAffiliationRequestEmail(requesterName, roleLabel, businessName);
            await sendEmail(c.env.RESEND_API_KEY!, { to: owner.email, ...email });
          }
        } catch { /* non-critical */ }
      })()
    );
  }

  return c.json({
    success: true,
    data: {
      affiliation_id: affiliationId,
      business_name: businessName,
      status: 'pending',
    },
  });
});

/**
 * POST /api/affiliations/join-by-token
 * Resolve an invite token to the business info (for the /join/:token frontend route).
 * Does NOT create an affiliation — just returns the business details for the UI.
 */
affiliationsRoutes.post('/join-by-token', async (c) => {
  const body = await c.req.json<{ token: string }>();

  if (!body.token) {
    return c.json({ success: false, error: 'Token is required' }, 400);
  }

  const tokenHash = await sha256Hex(body.token);
  const invite = await c.env.DB.prepare(
    'SELECT business_page_id, is_active, expires_at, max_uses, use_count FROM affiliation_invites WHERE token_hash = ?'
  ).bind(tokenHash).first<{
    business_page_id: string;
    is_active: number;
    expires_at: number | null;
    max_uses: number | null;
    use_count: number;
  }>();

  if (!invite) {
    return c.json({ success: false, error: 'Invalid invite link' }, 404);
  }

  // Validate usability
  if (!invite.is_active) {
    return c.json({ success: false, error: 'This invite has been deactivated' }, 410);
  }
  const now = Math.floor(Date.now() / 1000);
  if (invite.expires_at && invite.expires_at < now) {
    return c.json({ success: false, error: 'This invite has expired' }, 410);
  }
  if (invite.max_uses && invite.use_count >= invite.max_uses) {
    return c.json({ success: false, error: 'This invite has reached its usage limit' }, 410);
  }

  const businessPage = await c.env.DB.prepare(
    'SELECT display_name, username, avatar_r2_key FROM bio_pages WHERE id = ?'
  ).bind(invite.business_page_id).first<{
    display_name: string | null;
    username: string;
    avatar_r2_key: string | null;
  }>();

  if (!businessPage) {
    return c.json({ success: false, error: 'Business page not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      business_name: businessPage.display_name || businessPage.username,
      business_username: businessPage.username,
      business_avatar_key: businessPage.avatar_r2_key,
    },
  });
});

/**
 * GET /api/affiliations/my/:memberPageId
 * List all affiliations for a member page.
 */
affiliationsRoutes.get('/my/:memberPageId', async (c) => {
  const user = c.get('user');
  const memberPageId = c.req.param('memberPageId');

  const page = await verifyPageOwnership(c.env.DB, memberPageId, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Page not found or not owned by you' }, 403);
  }

  const rows = await c.env.DB.prepare(
    `SELECT pa.id, pa.role_label, pa.status, pa.show_on_member_page, pa.created_at,
            bp.display_name AS business_name, bp.username AS business_username, bp.avatar_r2_key AS business_avatar_key
     FROM page_affiliations pa
     JOIN bio_pages bp ON bp.id = pa.business_page_id
     WHERE pa.member_page_id = ? AND pa.status IN ('pending', 'active')
     ORDER BY pa.created_at DESC`
  ).bind(memberPageId).all();

  return c.json({
    success: true,
    data: {
      affiliations: (rows.results || []).map((r: Record<string, unknown>) => ({
        id: r.id,
        businessName: r.business_name,
        businessUsername: r.business_username,
        businessAvatarKey: r.business_avatar_key,
        roleLabel: r.role_label,
        status: r.status,
        showOnMemberPage: !!r.show_on_member_page,
        createdAt: r.created_at,
      })),
    },
  });
});

/**
 * PATCH /api/affiliations/visibility/:affiliationId
 * Member toggles badge visibility on their own page.
 */
affiliationsRoutes.patch('/visibility/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');
  const body = await c.req.json<{ show_on_member_page: boolean }>();

  const affiliation = await c.env.DB.prepare(
    'SELECT id, member_page_id FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; member_page_id: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.member_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE page_affiliations SET show_on_member_page = ? WHERE id = ?'
  ).bind(body.show_on_member_page ? 1 : 0, affiliationId).run();
  await touchAffiliation(c.env.DB, affiliationId);

  return c.json({ success: true });
});

/**
 * PATCH /api/affiliations/role/:affiliationId
 * Member updates their role label.
 */
affiliationsRoutes.patch('/role/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');
  const body = await c.req.json<{ role_label: string }>();

  const roleLabel = stripHtml((body.role_label || '').trim());
  if (!roleLabel || roleLabel.length > 40) {
    return c.json({ success: false, error: 'Role label is required (max 40 characters)' }, 400);
  }

  const affiliation = await c.env.DB.prepare(
    'SELECT id, member_page_id FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; member_page_id: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.member_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE page_affiliations SET role_label = ? WHERE id = ?'
  ).bind(roleLabel, affiliationId).run();
  await touchAffiliation(c.env.DB, affiliationId);

  return c.json({ success: true });
});

/**
 * DELETE /api/affiliations/leave/:affiliationId
 * Member removes themselves from an affiliation.
 */
affiliationsRoutes.delete('/leave/:affiliationId', async (c) => {
  const user = c.get('user');
  const affiliationId = c.req.param('affiliationId');

  const affiliation = await c.env.DB.prepare(
    'SELECT id, member_page_id FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).first<{ id: string; member_page_id: string }>();

  if (!affiliation) {
    return c.json({ success: false, error: 'Affiliation not found' }, 404);
  }

  const page = await verifyPageOwnership(c.env.DB, affiliation.member_page_id, user.id);
  if (!page) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await c.env.DB.prepare(
    'DELETE FROM page_affiliations WHERE id = ?'
  ).bind(affiliationId).run();

  return c.json({ success: true });
});
