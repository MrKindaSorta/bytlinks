/**
 * Drip email templates for user activation and upgrade nudges.
 * Each function returns { subject, html, text } ready for sendEmail().
 */

const DASHBOARD_URL = 'https://www.bytlinks.com/dashboard';

/** 24hrs after signup, IF no avatar uploaded */
export function activationNudge(): { subject: string; html: string; text: string } {
  return {
    subject: 'Your page is missing a face',
    html: emailShell(`
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Add a profile photo</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 20px">
        Pages with a profile photo get <strong>3x more clicks</strong> than pages without one.
        It takes 10 seconds and makes a huge difference.
      </p>
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
        Add your photo
      </a>
    `),
    text: `Add a profile photo\n\nPages with a profile photo get 3x more clicks. Add yours: ${DASHBOARD_URL}`,
  };
}

/** 72hrs after signup, IF fewer than 3 links */
export function engagementNudge(): { subject: string; html: string; text: string } {
  return {
    subject: '3 things that make a great BytLinks page',
    html: emailShell(`
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Make your page stand out</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px">
        The best BytLinks pages have three things in common:
      </p>
      <ol style="font-size:14px;color:#374151;line-height:2;margin:0 0 20px;padding-left:20px">
        <li><strong>Social links</strong> — connect your Instagram, Twitter, LinkedIn</li>
        <li><strong>A theme that fits</strong> — pick one that matches your brand</li>
        <li><strong>At least 3 links</strong> — give visitors something to click</li>
      </ol>
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
        Finish your page
      </a>
    `),
    text: `3 things that make a great BytLinks page:\n1. Add social links\n2. Pick a theme\n3. Add at least 3 links\n\nFinish your page: ${DASHBOARD_URL}`,
  };
}

/** Day 7, IF still on free plan — include real view count */
export function upgradeDay7(viewCount: number): { subject: string; html: string; text: string } {
  const viewText = viewCount > 0
    ? `Your page has been viewed <strong>${viewCount} times</strong> this week.`
    : `People are finding your page.`;

  return {
    subject: "You've had visitors. Here's what Pro unlocks.",
    html: emailShell(`
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Your page is getting noticed</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px">
        ${viewText} Upgrade to Pro to make it fully yours.
      </p>
      <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 20px;padding-left:20px">
        <li>Remove the BytLinks badge</li>
        <li>All 19 content block types (up to 25)</li>
        <li>Link scheduling & auto-expiry</li>
        <li>Priority support</li>
      </ul>
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
        Upgrade to Pro — $9.99/mo
      </a>
    `),
    text: `Your page is getting noticed.\n\n${viewCount > 0 ? `${viewCount} views this week.` : ''}\n\nUpgrade to Pro for $9.99/mo:\n- Remove BytLinks badge\n- All 19 block types\n- Link scheduling\n\n${DASHBOARD_URL}`,
  };
}

/** Day 14, IF still on free plan */
export function upgradeDay14(): { subject: string; html: string; text: string } {
  return {
    subject: 'Last thing — your data is always yours',
    html: emailShell(`
      <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px">Your data is always yours</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px">
        Unlike other platforms, BytLinks lets you export everything — your links, blocks,
        contacts, and analytics — anytime, for free. No lock-in, ever.
      </p>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 20px">
        Ready to make your page truly professional? Pro removes the BytLinks badge,
        unlocks all block types, and gives you full control.
      </p>
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
        Upgrade to Pro — $9.99/mo
      </a>
    `),
    text: `Your data is always yours.\n\nUnlike other platforms, BytLinks lets you export everything — anytime, for free.\n\nUpgrade to Pro for $9.99/mo: ${DASHBOARD_URL}`,
  };
}

function emailShell(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 28px">
      ${body}
    </div>
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
      <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center">
        BytLinks — Your professional presence, in one link.
        <br />
        <a href="https://www.bytlinks.com/dashboard" style="color:#9ca3af">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
