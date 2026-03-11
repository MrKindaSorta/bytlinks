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

export interface SocialLink {
  platform: string;
  url: string;
}

/** Map platform identifiers to their base profile URLs. */
const PLATFORM_DOMAINS: Record<string, string> = {
  twitter: 'https://twitter.com/',
  x: 'https://x.com/',
  linkedin: 'https://linkedin.com/in/',
  github: 'https://github.com/',
  instagram: 'https://instagram.com/',
  youtube: 'https://youtube.com/',
  tiktok: 'https://tiktok.com/@',
  spotify: 'https://open.spotify.com/artist/',
  soundcloud: 'https://soundcloud.com/',
  twitch: 'https://twitch.tv/',
  website: '', // full URL stored directly
};

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

/** Check if avatar_r2_key is set and non-empty. */
function hasAvatar(profile: ProfileMetaData): boolean {
  return !!(profile.avatar_r2_key && profile.avatar_r2_key.trim() !== '');
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

/**
 * Build the resolved meta description from profile data.
 *
 * Fallback chain:
 * 1. seo_description (user-set override) — use as-is
 * 2. bio (first 150 chars, HTML stripped)
 * 3. Auto-generated: "{job_title} at {company_name}. Find all their links on BytLinks."
 * 4. Auto-generated: "{job_title}. Find all their links on BytLinks."
 * 5. Final fallback: "Find all of @{username}'s links and contact info on BytLinks."
 *
 * Max length: 160 chars, truncated with "..." after resolution.
 */
function resolveDescription(p: ProfileMetaData): string {
  if (p.seo_description) {
    return truncate(stripHtml(p.seo_description), 160);
  }
  if (p.bio) {
    return truncate(stripHtml(p.bio), 160);
  }
  if (p.job_title && p.company_name) {
    return truncate(`${p.job_title} at ${p.company_name}. Find all their links on BytLinks.`, 160);
  }
  if (p.job_title) {
    return truncate(`${p.job_title}. Find all their links on BytLinks.`, 160);
  }
  return `Find all of @${p.username}'s links and contact info on BytLinks.`;
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

/** Build sameAs URLs from social links for JSON-LD. */
function buildSameAs(socialLinks: SocialLink[]): string[] {
  return socialLinks
    .map((link) => {
      if (!link.url || !link.platform) return null;
      const url = link.url.startsWith('http')
        ? link.url
        : (PLATFORM_DOMAINS[link.platform] || '') + link.url;
      try { new URL(url); return url; }
      catch { return null; }
    })
    .filter((url): url is string => url !== null);
}

/**
 * Build all meta tags for a public profile page.
 * Returns an HTML string to inject into <head>.
 */
export function buildMetaTags(profile: ProfileMetaData, socialLinks: SocialLink[], baseUrl: string): string {
  const title = escapeAttr(resolveTitle(profile));
  const description = escapeAttr(resolveDescription(profile));
  const keywords = escapeAttr(resolveKeywords(profile));
  const url = `${baseUrl}/${encodeURIComponent(profile.username)}`;

  const avatarPresent = hasAvatar(profile);
  const ogImage = avatarPresent
    ? `${baseUrl}/api/public/avatar/${profile.avatar_r2_key}`
    : `${baseUrl}/og-default.png`;

  // Use summary_large_image when a custom avatar exists for larger Twitter/X previews
  const twitterCard = avatarPresent ? 'summary_large_image' : 'summary';

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
    `<meta name="twitter:card" content="${twitterCard}" />`,
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
export function buildJsonLd(profile: ProfileMetaData, socialLinks: SocialLink[], baseUrl: string): string {
  const jsonLdObject: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.display_name || profile.username,
    url: `${baseUrl}/${encodeURIComponent(profile.username)}`,
  };

  // Conditionally add fields — never include null/empty
  if (profile.bio) jsonLdObject.description = stripHtml(profile.bio);
  if (profile.job_title) jsonLdObject.jobTitle = profile.job_title;

  if (profile.company_name) {
    jsonLdObject.worksFor = {
      '@type': 'Organization',
      name: profile.company_name,
    };
  }

  if (hasAvatar(profile)) {
    jsonLdObject.image = `${baseUrl}/api/public/avatar/${profile.avatar_r2_key}`;
  }

  const sameAs = buildSameAs(socialLinks);
  if (sameAs.length > 0) jsonLdObject.sameAs = sameAs;

  // Escape </script> in JSON output to prevent tag injection
  const json = JSON.stringify(jsonLdObject, null, 2).replace(/<\/script>/gi, '<\\/script>');

  return `<script type="application/ld+json">${json}</script>`;
}
