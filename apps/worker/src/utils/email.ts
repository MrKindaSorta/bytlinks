/**
 * Email sending via Resend REST API.
 * Works natively in Cloudflare Workers (no Node.js dependencies).
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'BytLinks <noreply@bytlinks.com>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(apiKey: string, params: SendEmailParams): Promise<boolean> {
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/** Build the welcome email sent immediately after signup. */
export function buildWelcomeEmail(username: string): { subject: string; html: string; text: string } {
  const pageUrl = `https://www.bytlinks.com/${username}`;
  const dashboardUrl = 'https://www.bytlinks.com/dashboard';

  return {
    subject: 'Your BytLinks page is live',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 28px 0">
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Your page is live!</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px">
        Welcome to BytLinks. Your professional page is ready at:
      </p>
      <a href="${pageUrl}" style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px">
        bytlinks.com/${username}
      </a>
    </div>
    <div style="padding:0 28px 28px">
      <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 12px">Get started in 3 steps:</p>
      <ol style="font-size:13px;color:#374151;line-height:1.8;margin:0 0 24px;padding-left:20px">
        <li>Add a profile photo and bio</li>
        <li>Add your links and content blocks</li>
        <li>Share your URL everywhere</li>
      </ol>
      <a href="${dashboardUrl}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
        Open your dashboard
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
      <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center">
        BytLinks — Your professional presence, in one link.
      </p>
    </div>
  </div>
</body>
</html>`,
    text: `Your BytLinks page is live!\n\nYour page: ${pageUrl}\n\nGet started:\n1. Add a profile photo and bio\n2. Add your links and content blocks\n3. Share your URL everywhere\n\nOpen your dashboard: ${dashboardUrl}`,
  };
}

/** Build form submission notification email. */
export function buildFormSubmissionEmail(
  formTitle: string,
  data: Record<string, unknown>,
  fieldLabels: Record<string, string>,
): { subject: string; html: string; text: string } {
  const fieldRows = Object.entries(data)
    .map(([fieldId, value]) => {
      const label = fieldLabels[fieldId] || fieldId;
      const displayValue = value === null || value === undefined ? '—' : String(value);
      return { label, value: displayValue };
    })
    .filter((r) => r.value.trim());

  const htmlRows = fieldRows
    .map((r) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(r.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111">${escapeHtml(r.value)}</td></tr>`)
    .join('');

  const textRows = fieldRows.map((r) => `${r.label}: ${r.value}`).join('\n');

  return {
    subject: `New submission: ${formTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:24px 28px 0">
      <h1 style="font-size:18px;font-weight:800;color:#111;margin:0 0 4px">New Form Submission</h1>
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">${escapeHtml(formTitle)}</p>
    </div>
    <div style="padding:0 28px 24px">
      <table style="width:100%;border-collapse:collapse">
        ${htmlRows}
      </table>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
      <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center">
        BytLinks — Your professional presence, in one link.
      </p>
    </div>
  </div>
</body>
</html>`,
    text: `New submission for ${formTitle}\n\n${textRows}`,
  };
}

/** Build the affiliation join request notification email. */
export function buildAffiliationRequestEmail(
  requesterName: string,
  roleLabel: string,
  businessName: string,
): { subject: string; html: string; text: string } {
  const dashboardUrl = 'https://www.bytlinks.com/dashboard?tab=affiliations';

  return {
    subject: 'Someone wants to join your team on BytLinks',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 28px 0">
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">New team request</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px">
        <strong style="color:#111">${escapeHtml(requesterName)}</strong> wants to join
        <strong style="color:#111">${escapeHtml(businessName)}</strong> as
        <strong style="color:#111">${escapeHtml(roleLabel)}</strong>.
      </p>
      <a href="${dashboardUrl}" style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px">
        Review in your dashboard
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
      <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center">
        BytLinks — Your professional presence, in one link.
      </p>
    </div>
  </div>
</body>
</html>`,
    text: `New team request\n\n${requesterName} wants to join ${businessName} as ${roleLabel}.\n\nReview in your dashboard: ${dashboardUrl}`,
  };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Build the password reset email. */
export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: 'Reset your BytLinks password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 28px">
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Reset your password</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px">
        We received a request to reset your BytLinks password. Click the button below to choose a new one.
      </p>
      <a href="${resetUrl}" style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px">
        Reset password
      </a>
      <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:0">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
      <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center">
        BytLinks — Your professional presence, in one link.
      </p>
    </div>
  </div>
</body>
</html>`,
    text: `Reset your BytLinks password\n\nClick the link below to choose a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
  };
}
