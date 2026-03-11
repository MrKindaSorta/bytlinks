/**
 * Edge-side meta tag injection for public profile pages.
 * The Worker queries D1 for profile data and injects populated
 * <head> content into the SPA shell before serving it to crawlers.
 */

export interface ProfileMetaData {
  username: string;
  display_name: string | null;
  bio: string | null;
  job_title: string | null;
  company_name: string | null;
  avatar_r2_key: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
}

/** Escape user strings for safe insertion into HTML attributes. */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Strip HTML tags from a string. */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Truncate to maxLen, appending "..." if clipped. */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/** Build the resolved page title from profile data. */
function resolveTitle(p: ProfileMetaData): string {
  if (p.seo_title) {
    const t = p.seo_title;
    // Append suffix unless already present
    return t.toLowerCase().includes('bytlinks') ? truncate(t, 60) : truncate(`${t} | BytLinks`, 60);
  }
  if (p.display_name) {
    return truncate(`${p.display_name} | BytLinks`, 60);
  }
  return truncate(`@${p.username} | BytLinks`, 60);
}

/** Build the resolved meta description from profile data. */
function resolveDescription(p: ProfileMetaData): string {
  if (p.seo_description) {
    return truncate(stripHtml(p.seo_description), 160);
  }
  if (p.bio) {
    return truncate(stripHtml(p.bio), 160);
  }
  if (p.job_title && p.company_name) {
    return truncate(`${p.job_title} at ${p.company_name}. Find all my links on BytLinks.`, 160);
  }
  if (p.job_title) {
    return truncate(`${p.job_title}. Find all my links on BytLinks.`, 160);
  }
  return `Find all of @${p.username}'s links, content, and contact info on BytLinks.`;
}

/** Build comma-separated keywords string. */
function resolveKeywords(p: ProfileMetaData): string {
  if (p.seo_keywords) {
    const parts = p.seo_keywords.split(',').map((t) => t.trim()).filter(Boolean);
    // Always append base keywords
    parts.push('link in bio', 'BytLinks');
    return [...new Set(parts)].join(', ');
  }
  const auto: string[] = [p.username];
  if (p.display_name) auto.push(p.display_name);
  if (p.job_title) auto.push(p.job_title);
  auto.push('link in bio', 'BytLinks');
  return auto.join(', ');
}

/**
 * Build all meta tags for a public profile page.
 * Returns an HTML string to inject into <head>.
 */
export function buildMetaTags(profile: ProfileMetaData, baseUrl: string): string {
  const title = escapeAttr(resolveTitle(profile));
  const description = escapeAttr(resolveDescription(profile));
  const keywords = escapeAttr(resolveKeywords(profile));
  const url = `${baseUrl}/${encodeURIComponent(profile.username)}`;

  const ogImage = profile.avatar_r2_key
    ? `${baseUrl}/api/public/avatar/${profile.avatar_r2_key}`
    : `${baseUrl}/og-default.png`;

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="keywords" content="${keywords}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="BytLinks" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
  ].join('\n    ');
}

/**
 * Build a JSON-LD Person schema block for structured data.
 * Returns a <script type="application/ld+json"> string.
 */
export function buildJsonLd(profile: ProfileMetaData, baseUrl: string): string {
  const name = profile.display_name || profile.username;
  const url = `${baseUrl}/${encodeURIComponent(profile.username)}`;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
  };

  const desc = resolveDescription(profile);
  if (desc) schema.description = desc;

  if (profile.job_title) schema.jobTitle = profile.job_title;

  if (profile.company_name) {
    schema.worksFor = {
      '@type': 'Organization',
      name: profile.company_name,
    };
  }

  if (profile.avatar_r2_key) {
    schema.image = `${baseUrl}/api/public/avatar/${profile.avatar_r2_key}`;
  }

  // Escape </script> in JSON output to prevent tag injection
  const json = JSON.stringify(schema, null, 2).replace(/<\/script>/gi, '<\\/script>');

  return `<script type="application/ld+json">${json}</script>`;
}
