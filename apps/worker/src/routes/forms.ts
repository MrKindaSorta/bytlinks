import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, type AuthUser } from '../middleware/auth';

export const formRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

formRoutes.use('*', authMiddleware);

/** Helper: verify block ownership */
async function verifyBlockOwnership(db: D1Database, blockId: string, userId: string): Promise<boolean> {
  const result = await db.prepare(
    `SELECT cb.id FROM content_blocks cb
     JOIN bio_pages bp ON bp.id = cb.page_id
     WHERE cb.id = ? AND bp.user_id = ?`
  ).bind(blockId, userId).first();
  return !!result;
}

/**
 * GET /api/forms/:blockId/submissions?page=1&limit=25
 */
formRoutes.get('/:blockId/submissions', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('blockId');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '25', 10)));

  try {
    if (!(await verifyBlockOwnership(c.env.DB, blockId, user.id))) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const [countResult, submissions] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE block_id = ?')
        .bind(blockId).first<{ count: number }>(),
      c.env.DB.prepare(
        'SELECT id, data, ip_hash, created_at FROM form_submissions WHERE block_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(blockId, limit, (page - 1) * limit).all(),
    ]);

    const total = countResult?.count ?? 0;
    return c.json({
      success: true,
      data: submissions.results.map((r: Record<string, unknown>) => ({
        ...r,
        data: JSON.parse(r.data as string),
      })),
      total,
      page,
      total_pages: Math.ceil(total / limit),
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load submissions' }, 500);
  }
});

/**
 * GET /api/forms/:blockId/submissions/export?format=csv|json
 */
formRoutes.get('/:blockId/submissions/export', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('blockId');
  const format = c.req.query('format') || 'csv';

  try {
    if (!(await verifyBlockOwnership(c.env.DB, blockId, user.id))) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    // Check pro plan for export
    const userRow = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(user.id).first<{ plan: string }>();
    if (userRow?.plan !== 'pro') {
      return c.json({ success: false, error: 'Pro plan required for export' }, 403);
    }

    // Get form field labels
    const block = await c.env.DB.prepare('SELECT data FROM content_blocks WHERE id = ?').bind(blockId).first<{ data: string }>();
    const formData = block ? JSON.parse(block.data) : { fields: [] };
    const fields = formData.fields || [];

    const submissions = await c.env.DB.prepare(
      'SELECT data, created_at FROM form_submissions WHERE block_id = ? ORDER BY created_at DESC'
    ).bind(blockId).all();

    if (format === 'json') {
      const jsonData = submissions.results.map((r: Record<string, unknown>) => ({
        ...JSON.parse(r.data as string),
        submitted_at: r.created_at,
      }));
      return c.json(jsonData);
    }

    // CSV
    const headers = [...fields.map((f: { label: string }) => f.label || 'Field'), 'Submitted At'];
    const rows = submissions.results.map((r: Record<string, unknown>) => {
      const data = JSON.parse(r.data as string);
      return [...fields.map((f: { id: string }) => String(data[f.id] ?? '')), String(r.created_at)];
    });

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row: string[]) => row.map(escapeCsv).join(',')),
    ];

    return new Response(csvLines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="form-${blockId}.csv"`,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/**
 * DELETE /api/forms/:blockId/submissions/:id
 */
formRoutes.delete('/:blockId/submissions/:id', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('blockId');
  const submissionId = c.req.param('id');

  try {
    if (!(await verifyBlockOwnership(c.env.DB, blockId, user.id))) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare(
      'DELETE FROM form_submissions WHERE id = ? AND block_id = ?'
    ).bind(submissionId, blockId).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete' }, 500);
  }
});

/**
 * GET /api/forms/:blockId/submissions/count
 */
formRoutes.get('/:blockId/submissions/count', async (c) => {
  const user = c.get('user');
  const blockId = c.req.param('blockId');

  try {
    if (!(await verifyBlockOwnership(c.env.DB, blockId, user.id))) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const weekStart = now - 7 * 86400;

    const [total, today, week] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE block_id = ?').bind(blockId).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE block_id = ? AND created_at >= ?').bind(blockId, todayStart).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE block_id = ? AND created_at >= ?').bind(blockId, weekStart).first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: { total: total?.count ?? 0, today: today?.count ?? 0, this_week: week?.count ?? 0 },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to load count' }, 500);
  }
});

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
