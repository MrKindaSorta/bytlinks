import { Hono } from 'hono';
import type { Env } from '../index';
import { decryptCredential } from '../utils/crypto';
import { syncToMailchimp, syncToConvertKit } from '../utils/emailProviders';
import { checkRateLimit } from '../utils/rateLimit';
import type { NewsletterData, FileDownloadData, FormData as FormBlockData } from '@bytlinks/shared';
import { getDownloadCount } from './analytics';
import { sendEmail, buildFormSubmissionEmail } from '../utils/email';

export const publicRoutes = new Hono<{ Bindings: Env }>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** MIME types safe to serve inline (everything else is forced-download). */
const INLINE_SAFE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
]);

/**
 * GET /api/public/avatar/:key+ — serve avatar from R2
 */
publicRoutes.get('/avatar/*', async (c) => {
  const key = c.req.path.replace('/api/public/avatar/', '');

  try {
    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, { headers });
  } catch {
    return c.json({ success: false, error: 'Failed to load image' }, 500);
  }
});

/**
 * GET /api/public/file/:key+ — serve file from R2 (blocks uploads)
 */
publicRoutes.get('/file/*', async (c) => {
  const key = c.req.path.replace('/api/public/file/', '');

  // Validate key format — must be a blocks/, avatars/, or forms/ path
  if (!key.startsWith('blocks/') && !key.startsWith('avatars/') && !key.startsWith('forms/')) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }

  try {
    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=86400');
    headers.set('X-Content-Type-Options', 'nosniff');

    // Only serve images inline; everything else is forced download
    if (INLINE_SAFE_TYPES.has(contentType)) {
      headers.set('Content-Type', contentType);
    } else {
      headers.set('Content-Type', 'application/octet-stream');
      headers.set('Content-Disposition', 'attachment');
    }

    return new Response(object.body, { headers });
  } catch {
    return c.json({ success: false, error: 'Failed to load file' }, 500);
  }
});

/**
 * GET /api/public/block/:blockId/download-count — public download count badge
 * Returns { count: number } only if show_download_count is true AND count >= count_min_threshold.
 * Otherwise returns { count: null }.
 */
publicRoutes.get('/block/:blockId/download-count', async (c) => {
  const blockId = c.req.param('blockId');

  try {
    const block = await c.env.DB.prepare(
      'SELECT data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'file-download').first<{ data: string }>();

    if (!block) {
      return c.json({ count: null });
    }

    const data = JSON.parse(block.data) as FileDownloadData;
    if (!data.show_download_count) {
      return c.json({ count: null });
    }

    const minThreshold = data.count_min_threshold ?? 50;
    const count = await getDownloadCount(c.env.DB, blockId);

    if (count >= minThreshold) {
      return c.json({ count });
    }
    return c.json({ count: null });
  } catch {
    return c.json({ count: null });
  }
});

/**
 * POST /api/public/poll/:blockId/vote — cast a poll vote (cookie-gated)
 */
publicRoutes.post('/poll/:blockId/vote', async (c) => {
  const blockId = c.req.param('blockId');
  const body = await c.req.json<{ option_id: string }>();

  if (!body.option_id) {
    return c.json({ success: false, error: 'option_id is required' }, 400);
  }

  // Check cookie for prior vote
  const cookieName = `poll_${blockId}`;
  const cookies = c.req.header('cookie') || '';
  if (cookies.includes(cookieName)) {
    return c.json({ success: false, error: 'Already voted' }, 409);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'poll').first<{ id: string; data: string }>();

    if (!block) {
      return c.json({ success: false, error: 'Poll not found' }, 404);
    }

    const pollData = JSON.parse(block.data);
    const isPastEndDate = pollData.end_date
      ? new Date(pollData.end_date).getTime() < Date.now()
      : false;
    if (pollData.closed || isPastEndDate) {
      return c.json({ success: false, error: 'Poll is closed' }, 403);
    }

    const option = pollData.options.find((o: { id: string }) => o.id === body.option_id);
    if (!option) {
      return c.json({ success: false, error: 'Invalid option' }, 400);
    }

    option.votes = (option.votes || 0) + 1;

    await c.env.DB.prepare(
      'UPDATE content_blocks SET data = ? WHERE id = ?'
    ).bind(JSON.stringify(pollData), blockId).run();

    // Set cookie to prevent re-voting (30 days)
    const res = c.json({ success: true, data: pollData });
    res.headers.set('Set-Cookie', `${cookieName}=1; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res;
  } catch {
    return c.json({ success: false, error: 'Failed to vote' }, 500);
  }
});

/**
 * POST /api/public/newsletter/:blockId — submit email signup
 */
publicRoutes.post('/newsletter/:blockId', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // D1-backed rate limit: 10 signups per IP per hour
  const allowed = await checkRateLimit(c.env.DB, `newsletter:${ip}`, 10, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many requests. Try again later.' }, 429);
  }

  const blockId = c.req.param('blockId');
  const body = await c.req.json<{ email: string }>();

  if (!body.email || !EMAIL_RE.test(body.email)) {
    return c.json({ success: false, error: 'Valid email is required' }, 400);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'newsletter').first<{ id: string; data: string }>();

    if (!block) {
      return c.json({ success: false, error: 'Newsletter not found' }, 404);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO newsletter_signups (id, block_id, email) VALUES (?, ?, ?)'
    ).bind(id, blockId, body.email).run();

    // Sync to email provider if configured
    const blockData = JSON.parse(block.data) as NewsletterData;
    const syncProvider = blockData.sync_provider;

    if (syncProvider && syncProvider !== 'none' && c.env.CREDENTIALS_ENCRYPTION_KEY) {
      const encKey = c.env.CREDENTIALS_ENCRYPTION_KEY;
      const email = body.email;

      // Use ctx.waitUntil so the response is sent immediately
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const cred = await c.env.DB.prepare(
              'SELECT encrypted_key, metadata FROM provider_credentials WHERE block_id = ? AND provider = ? LIMIT 1'
            ).bind(blockId, syncProvider).first<{ encrypted_key: string; metadata: string | null }>();

            if (!cred) return;

            const apiKey = await decryptCredential(cred.encrypted_key, encKey);
            if (!apiKey) return;

            if (syncProvider === 'mailchimp') {
              const meta = cred.metadata ? JSON.parse(cred.metadata) as { audience_id?: string; datacenter?: string } : {};
              const audienceId = blockData.mailchimp_audience_id || meta.audience_id || '';
              const datacenter = blockData.mailchimp_datacenter || meta.datacenter;
              if (audienceId) {
                await syncToMailchimp(email, apiKey, audienceId, datacenter);
              }
            } else if (syncProvider === 'convertkit') {
              const formId = blockData.convertkit_form_id || '';
              if (formId) {
                await syncToConvertKit(email, apiKey, formId);
              }
            }
          } catch {
            // Sync failure is non-critical — subscriber is already saved locally
          }
        })()
      );
    }

    // If no rows changed, email already existed — still return success to user
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to subscribe' }, 500);
  }
});

/**
 * POST /api/public/event/:blockId/interested — mark interest via cookie (no body)
 */
publicRoutes.post('/event/:blockId/interested', async (c) => {
  const blockId = c.req.param('blockId');
  const cookieName = `event_interested_${blockId}`;
  const cookies = c.req.header('cookie') || '';

  if (cookies.includes(cookieName)) {
    // Already marked — just return current count
    try {
      const block = await c.env.DB.prepare(
        'SELECT data FROM content_blocks WHERE id = ? AND block_type = ?'
      ).bind(blockId, 'event').first<{ data: string }>();
      if (!block) return c.json({ success: false, error: 'Event not found' }, 404);
      const eventData = JSON.parse(block.data);
      return c.json({ interested_count: eventData.interested_count || 0 });
    } catch {
      return c.json({ success: false, error: 'Failed' }, 500);
    }
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'event').first<{ id: string; data: string }>();

    if (!block) return c.json({ success: false, error: 'Event not found' }, 404);

    const eventData = JSON.parse(block.data);
    if (!eventData.rsvp_enabled) return c.json({ success: false, error: 'RSVP not enabled' }, 403);

    eventData.interested_count = (eventData.interested_count || 0) + 1;

    await c.env.DB.prepare(
      'UPDATE content_blocks SET data = ? WHERE id = ?'
    ).bind(JSON.stringify(eventData), blockId).run();

    // Also insert an rsvp row for tracking
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO event_rsvps (id, block_id, type) VALUES (?, ?, ?)'
    ).bind(id, blockId, 'interested').run();

    const res = c.json({ interested_count: eventData.interested_count });
    res.headers.set('Set-Cookie', `${cookieName}=1; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res;
  } catch {
    return c.json({ success: false, error: 'Failed to mark interest' }, 500);
  }
});

/**
 * POST /api/public/event/:blockId/rsvp — submit RSVP form
 */
publicRoutes.post('/event/:blockId/rsvp', async (c) => {
  const blockId = c.req.param('blockId');
  const body = await c.req.json<{ name?: string; email: string }>();

  if (!body.email || !EMAIL_RE.test(body.email)) {
    return c.json({ success: false, error: 'Valid email is required' }, 400);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'event').first<{ id: string; data: string }>();

    if (!block) return c.json({ success: false, error: 'Event not found' }, 404);

    const eventData = JSON.parse(block.data);
    if (!eventData.rsvp_enabled) return c.json({ success: false, error: 'RSVP not enabled' }, 403);
    if (eventData.rsvp_mode === 'interested') {
      return c.json({ success: false, error: 'Full RSVP not available for this event' }, 403);
    }

    // Check cap
    if (eventData.rsvp_cap) {
      const count = await c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM event_rsvps WHERE block_id = ? AND type = 'rsvp'"
      ).bind(blockId).first<{ cnt: number }>();
      if (count && count.cnt >= eventData.rsvp_cap) {
        return c.json({ success: false, error: 'RSVP capacity reached' }, 409);
      }
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO event_rsvps (id, block_id, type, name, email) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, blockId, 'rsvp', body.name || null, body.email).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to submit RSVP' }, 500);
  }
});

/**
 * POST /api/public/form/:blockId/submit — submit a form response
 */
publicRoutes.post('/form/:blockId/submit', async (c) => {
  const blockId = c.req.param('blockId');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 20 submissions per IP per hour
  const allowed = await checkRateLimit(c.env.DB, `form-submit:${ip}`, 20, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many requests. Try again later.' }, 429);
  }

  try {
    const block = await c.env.DB.prepare(
      'SELECT id, page_id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'form').first<{ id: string; page_id: string; data: string }>();

    if (!block) {
      return c.json({ success: false, error: 'Form not found' }, 404);
    }

    const formData = JSON.parse(block.data) as FormBlockData;

    // Check close date
    if (formData.close_date && new Date(formData.close_date).getTime() < Date.now()) {
      return c.json({ success: false, error: 'This form is closed' }, 403);
    }

    // Check submission cap
    if (formData.submission_cap) {
      const count = await c.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM form_submissions WHERE block_id = ?'
      ).bind(blockId).first<{ cnt: number }>();
      if (count && count.cnt >= formData.submission_cap) {
        return c.json({ success: false, error: 'Submission cap reached' }, 409);
      }
    }

    // Check one-response-per-visitor cookie
    const cookieName = `form_${blockId}`;
    const cookies = c.req.header('cookie') || '';
    if (formData.one_response_per_visitor && cookies.includes(cookieName)) {
      return c.json({ success: false, error: 'You have already submitted this form' }, 409);
    }

    // Turnstile CAPTCHA verification
    const body = await c.req.json<{ data: Record<string, unknown>; turnstile_token?: string }>();
    if (formData.captcha_enabled && c.env.TURNSTILE_SECRET_KEY) {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${c.env.TURNSTILE_SECRET_KEY}&response=${body.turnstile_token || ''}`,
      });
      const turnstileJson = await turnstileRes.json() as { success: boolean };
      if (!turnstileJson.success) {
        return c.json({ success: false, error: 'CAPTCHA verification failed' }, 403);
      }
    }

    // Hash IP for privacy
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(ip + blockId));
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const submissionId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO form_submissions (id, block_id, data, ip_hash) VALUES (?, ?, ?, ?)'
    ).bind(submissionId, blockId, JSON.stringify(body.data || {}), ipHash).run();

    // Fire-and-forget: email notification + webhook
    c.executionCtx.waitUntil(
      (async () => {
        // Email alert
        if (formData.email_alert_enabled && formData.email_alert_mode !== 'daily_digest' && c.env.RESEND_API_KEY) {
          let recipient = formData.email_alert_recipient;
          if (!recipient) {
            // Look up page owner email
            const owner = await c.env.DB.prepare(
              'SELECT u.email FROM users u JOIN bio_pages bp ON bp.user_id = u.id WHERE bp.id = ?'
            ).bind(block.page_id).first<{ email: string }>();
            recipient = owner?.email;
          }
          if (recipient) {
            const fieldLabels: Record<string, string> = {};
            for (const f of formData.fields || []) {
              fieldLabels[f.id] = f.label || f.type;
            }
            const email = buildFormSubmissionEmail(formData.title || 'Form', body.data || {}, fieldLabels);
            await sendEmail(c.env.RESEND_API_KEY, { to: recipient, ...email });
          }
        }
        // Webhook
        if (formData.webhook_enabled && formData.webhook_url) {
          const fieldLabels: Record<string, unknown> = {};
          for (const f of formData.fields || []) {
            fieldLabels[f.label || f.type] = body.data?.[f.id];
          }
          try {
            await fetch(formData.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'form_submission',
                block_id: blockId,
                submission_id: submissionId,
                submitted_at: Math.floor(Date.now() / 1000),
                fields: fieldLabels,
              }),
              signal: AbortSignal.timeout(10000),
            });
          } catch { /* fire-and-forget */ }
        }
      })()
    );

    const res = c.json({ success: true });
    if (formData.one_response_per_visitor) {
      res.headers.set('Set-Cookie', `${cookieName}=1; Path=/; Max-Age=2592000; SameSite=Lax`);
    }
    return res;
  } catch {
    return c.json({ success: false, error: 'Failed to submit form' }, 500);
  }
});

/**
 * POST /api/public/form/:blockId/upload — file upload for form file-upload fields
 */
publicRoutes.post('/form/:blockId/upload', async (c) => {
  const blockId = c.req.param('blockId');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  // Rate limit: 5 uploads per IP per hour
  const allowed = await checkRateLimit(c.env.DB, `form-upload:${ip}`, 5, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many uploads. Try again later.' }, 429);
  }

  try {
    // Verify the block exists and is a form
    const block = await c.env.DB.prepare(
      'SELECT id, page_id, data FROM content_blocks WHERE id = ? AND block_type = ?'
    ).bind(blockId, 'form').first<{ id: string; page_id: string; data: string }>();
    if (!block) {
      return c.json({ success: false, error: 'Form not found' }, 404);
    }

    // Get the page owner for R2 key path
    const page = await c.env.DB.prepare(
      'SELECT user_id FROM bio_pages WHERE id = ?'
    ).bind(block.page_id).first<{ user_id: string }>();
    if (!page) return c.json({ success: false, error: 'Not found' }, 404);

    const formDataMultipart = await c.req.formData();
    const file = formDataMultipart.get('file') as File | null;
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'File too large (max 10MB)' }, 413);
    }

    const tempId = crypto.randomUUID();
    const r2Key = `forms/${page.user_id}/${tempId}/${file.name}`;

    await c.env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    return c.json({ success: true, data: { url: `/api/public/file/${r2Key}` } });
  } catch {
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

/**
 * GET /api/public/batch-profiles?usernames=alice,bob,carol — fetch multiple profiles in one query
 */
publicRoutes.get('/batch-profiles', async (c) => {
  const raw = c.req.query('usernames');
  if (!raw) return c.json({ success: false, error: 'usernames param is required' }, 400);

  const usernames = raw.split(',').map((u) => u.trim()).filter(Boolean).slice(0, 20);
  if (usernames.length === 0) return c.json({ success: true, data: [] });

  try {
    const placeholders = usernames.map(() => '?').join(',');
    const rows = await c.env.DB.prepare(
      `SELECT username, display_name, bio, job_title, profession, avatar_r2_key FROM bio_pages WHERE username IN (${placeholders}) AND is_published = 1`
    ).bind(...usernames).all();

    return c.json({
      success: true,
      data: rows.results.map((r: Record<string, unknown>) => ({
        username: r.username,
        display_name: r.display_name,
        bio: r.bio,
        job_title: r.job_title,
        profession: r.profession,
        avatar_r2_key: r.avatar_r2_key,
      })),
    });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch profiles' }, 500);
  }
});

/**
 * GET /api/public/:username/vcard — generate VCard (.vcf) for a public page
 */
publicRoutes.get('/:username/vcard', async (c) => {
  const username = c.req.param('username');

  try {
    const page = await c.env.DB.prepare(
      'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
    ).bind(username).first();

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const [owner, cards] = await Promise.all([
      c.env.DB.prepare(
        'SELECT email FROM users WHERE id = ?'
      ).bind(page.user_id).first<{ email: string }>(),
      c.env.DB.prepare(
        'SELECT * FROM business_cards WHERE page_id = ? ORDER BY order_num LIMIT 1'
      ).bind(page.id).all().catch(() => ({ results: [] as Record<string, unknown>[] })),
    ]);

    // Use the first business card's visibility settings, or fall back to legacy bio_pages fields
    const card = cards.results[0] as Record<string, unknown> | undefined;
    const showEmail = card ? !!card.show_email : !!page.show_email_card;
    const showPhone = card ? !!card.show_phone : !!page.show_phone_card;
    const showCompany = card ? !!card.show_company : !!page.show_company_card;
    const showAddress = card ? !!card.show_address : !!page.show_address_card;

    // Build VCard using card-visibility toggles
    const displayName = (page.display_name as string) || username;
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcardEscape(displayName)}`,
    ];

    if (page.company_name && showCompany) {
      lines.push(`ORG:${vcardEscape(page.company_name as string)}`);
    }
    if (page.job_title) {
      lines.push(`TITLE:${vcardEscape(page.job_title as string)}`);
    }
    if (owner?.email && showEmail) {
      const emailLabel = (page.email_label as string) || 'INTERNET';
      lines.push(`EMAIL;TYPE=${vcardEscape(emailLabel)}:${vcardEscape(owner.email)}`);
    }
    if (page.secondary_email && page.show_secondary_email_page) {
      const secLabel = (page.secondary_email_label as string) || 'INTERNET';
      lines.push(`EMAIL;TYPE=${vcardEscape(secLabel)}:${vcardEscape(page.secondary_email as string)}`);
    }
    if (page.phone && showPhone) {
      lines.push(`TEL;TYPE=CELL:${vcardEscape(page.phone as string)}`);
    }
    if (page.address && showAddress) {
      lines.push(`ADR;TYPE=WORK:;;${vcardEscape(page.address as string)};;;;`);
    }

    lines.push(`URL:https://www.bytlinks.com/${encodeURIComponent(username)}`);

    if (page.avatar_r2_key) {
      lines.push(`PHOTO;VALUE=URI:https://www.bytlinks.com/api/public/avatar/${page.avatar_r2_key}`);
    }

    lines.push('END:VCARD');

    const vcf = lines.join('\r\n');

    const disposition = c.req.query('inline') !== undefined ? 'inline' : 'attachment';
    const safeFilename = username.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new Response(vcf, {
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `${disposition}; filename="${safeFilename}.vcf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to generate vcard' }, 500);
  }
});

/** Escape special characters for VCard fields (RFC 6350). */
function vcardEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n');
}

/**
 * GET /api/public/card/:token — fetch a single card by its access token
 * Rate-limited: 20 unique tokens per IP per hour to prevent enumeration
 */
publicRoutes.get('/card/:token', async (c) => {
  const token = c.req.param('token');

  // Validate token format (22 chars, alphanumeric)
  if (!token || !/^[A-Za-z0-9]{22}$/.test(token)) {
    return c.json({ success: false, error: 'Invalid card link' }, 400);
  }

  // Rate limit per IP: 20 card lookups per hour
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const allowed = await checkRateLimit(c.env.DB, `card-view:${ip}`, 20, 3600);
  if (!allowed) {
    return c.json({ success: false, error: 'Too many requests. Please try again later.' }, 429);
  }

  try {
    const card = await c.env.DB.prepare(
      'SELECT * FROM business_cards WHERE access_token = ?'
    ).bind(token).first();

    if (!card) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const page = await c.env.DB.prepare(
      'SELECT * FROM bio_pages WHERE id = ? AND is_published = 1'
    ).bind(card.page_id).first();

    if (!page) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const [socialLinks, owner] = await Promise.all([
      c.env.DB.prepare(
        'SELECT * FROM social_links WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT email FROM users WHERE id = ?'
      ).bind(page.user_id).first<{ email: string }>(),
    ]);

    let theme: Record<string, unknown> = {};
    try { theme = JSON.parse(page.theme as string); } catch { /* use empty theme */ }

    // Resolve data: Card 1 (order_num=0) uses bio_pages, Cards 2+ use override fields
    const isPrimary = Number(card.order_num) === 0;
    const resolve = (override: unknown, fallback: unknown) =>
      isPrimary ? (fallback ?? null) : ((override as string) ?? (fallback as string) ?? null);

    return c.json({
      success: true,
      data: {
        page: {
          username: page.username,
          display_name: resolve(card.override_display_name, page.display_name),
          bio: resolve(card.override_bio, page.bio),
          job_title: resolve(card.override_job_title, page.job_title),
          avatar_r2_key: page.avatar_r2_key,
          company_name: resolve(card.override_company_name, page.company_name),
          phone: resolve(card.override_phone, page.phone),
          address: resolve(card.override_address, page.address),
          email: resolve(card.override_email, owner?.email),
          email_label: resolve(card.override_email_label, page.email_label),
          secondary_email: resolve(card.override_secondary_email, page.secondary_email),
          secondary_email_label: resolve(card.override_secondary_email_label, page.secondary_email_label),
          theme,
          show_branding: !!page.show_branding,
        },
        card: {
          id: card.id,
          label: card.label,
          show_avatar: !!card.show_avatar,
          show_job_title: !!card.show_job_title,
          show_bio: !!card.show_bio,
          show_email: !!card.show_email,
          show_secondary_email: !!card.show_secondary_email,
          show_phone: !!card.show_phone,
          show_company: !!card.show_company,
          show_address: !!card.show_address,
          show_socials: !!card.show_socials,
        },
        socialLinks: socialLinks.results,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/public/:username/card — legacy route, returns first card only
 */
publicRoutes.get('/:username/card', async (c) => {
  const username = c.req.param('username');

  try {
    const page = await c.env.DB.prepare(
      'SELECT id FROM bio_pages WHERE username = ? AND is_published = 1'
    ).bind(username).first<{ id: string }>();

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const card = await c.env.DB.prepare(
      'SELECT access_token FROM business_cards WHERE page_id = ? ORDER BY order_num LIMIT 1'
    ).bind(page.id).first<{ access_token: string }>();

    if (!card?.access_token) {
      return c.json({ success: false, error: 'No cards configured' }, 404);
    }

    // Redirect to the token-based URL
    return c.json({ success: true, data: { redirect: `/c/${card.access_token}` } });
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/public/:username — fetch a public bio page with all content
 */
publicRoutes.get('/:username', async (c) => {
  const username = c.req.param('username');

  try {
    const page = await c.env.DB.prepare(
      'SELECT * FROM bio_pages WHERE username = ? AND is_published = 1'
    ).bind(username).first();

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    const [links, socialLinks, embeds, blocks, owner] = await Promise.all([
      c.env.DB.prepare(
        `SELECT * FROM links WHERE page_id = ? AND is_visible = 1
         AND (published_at IS NULL OR published_at <= ?)
         AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY order_num`
      ).bind(page.id, now, now).all(),
      c.env.DB.prepare(
        'SELECT * FROM social_links WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM embed_blocks WHERE page_id = ? ORDER BY order_num'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT * FROM content_blocks WHERE page_id = ? AND is_visible = 1 ORDER BY created_at'
      ).bind(page.id).all(),
      c.env.DB.prepare(
        'SELECT verified, email FROM users WHERE id = ?'
      ).bind(page.user_id).first<{ verified: number; email: string }>(),
    ]);

    const sectionOrder = page.section_order
      ? JSON.parse(page.section_order as string)
      : null;

    return c.json({
      success: true,
      data: {
        verified: !!(owner?.verified),
        page: {
          ...page,
          theme: JSON.parse(page.theme as string),
          section_order: sectionOrder,
          job_title: page.job_title ?? null,
          profession: page.profession ?? null,
          // Contact fields — only expose if page-visibility toggled on
          email: page.show_email_page ? (owner?.email ?? null) : null,
          email_label: page.email_label ?? null,
          secondary_email: page.show_secondary_email_page ? (page.secondary_email ?? null) : null,
          secondary_email_label: page.secondary_email_label ?? null,
          phone: page.show_phone_page ? (page.phone ?? null) : null,
          company_name: page.show_company_page ? (page.company_name ?? null) : null,
          address: page.show_address_page ? (page.address ?? null) : null,
          show_email_page: !!page.show_email_page,
        },
        links: links.results.map((l: Record<string, unknown>) => ({
          ...l,
          style_overrides: l.style_overrides ? JSON.parse(l.style_overrides as string) : null,
        })),
        socialLinks: socialLinks.results,
        embeds: embeds.results,
        blocks: blocks.results
          .map((b: Record<string, unknown>) => ({
            ...b,
            data: JSON.parse(b.data as string),
            is_visible: !!b.is_visible,
          }))
          .filter((b: Record<string, unknown>) => {
            // Auto-hide past events
            if (b.block_type === 'event') {
              const eventDate = (b.data as { event_date?: string }).event_date;
              if (eventDate && new Date(eventDate).getTime() < Date.now()) return false;
            }
            return true;
          }),
      },
    });
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});
