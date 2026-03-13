import { useState } from 'react';
import { ChevronDown, BadgeCheck } from 'lucide-react';
import type { BioPage, LayoutVariant, AffiliationBadgeData } from '@bytlinks/shared';
import { AvatarLightbox } from './AvatarLightbox';
import { AffiliationBadge } from './AffiliationBadge';

interface PageHeroProps {
  page: BioPage;
  username: string;
  layoutVariant?: LayoutVariant;
  /** When true, renders a plain image instead of clickable AvatarLightbox (for previews). */
  disableLightbox?: boolean;
  /** Show verified badge next to display name */
  verified?: boolean;
  /** Active affiliations to show as badges below the name. */
  affiliations?: AffiliationBadgeData[];
}

/**
 * Avatar + display name + bio + about me.
 * Social icons are rendered directly below the hero.
 */
export function PageHero({ page, username, layoutVariant = 'centered', disableLightbox, verified, affiliations }: PageHeroProps) {
  const avatarUrl = page.avatar_r2_key
    ? `/api/public/avatar/${page.avatar_r2_key}`
    : null;

  const avatar = avatarUrl ? (
    disableLightbox ? (
      <div
        className="w-24 h-24 rounded-full mb-4 overflow-hidden"
        style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }}
      >
        <img src={avatarUrl} alt={page.display_name || username} className="w-full h-full object-cover" fetchPriority="high" width={96} height={96} />
      </div>
    ) : (
      <AvatarLightbox
        src={avatarUrl}
        alt={page.display_name || username}
      />
    )
  ) : (
    <div
      className="w-24 h-24 rounded-full"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }}
    />
  );

  const nameBlock = page.display_name && (
    <h1
      className="text-3xl font-900 tracking-[-0.04em] leading-[1.05] mb-2"
      style={{ fontFamily: 'var(--page-font-display)' }}
    >
      <span className="inline-flex items-center gap-1.5">
        {page.display_name}
        {verified && (
          <BadgeCheck
            className="w-6 h-6 inline-block flex-shrink-0"
            style={{ color: 'var(--page-accent, #0d9488)' }}
            aria-label="Verified"
          />
        )}
      </span>
    </h1>
  );

  const bioBlock = page.bio && (
    <p
      className={`text-sm leading-[1.65] max-w-xs mb-4 ${layoutVariant === 'centered' ? 'mx-auto' : ''}`}
      style={{ opacity: 0.65 }}
    >
      {page.bio}
    </p>
  );

  // Hide About Me when empty — strip HTML tags to check for actual text content
  const aboutMeText = page.about_me?.replace(/<[^>]*>/g, '').trim();
  const aboutBlock = aboutMeText && page.about_me ? (
    <AboutMeSection text={page.about_me} centered={layoutVariant === 'centered'} defaultExpanded={!!page.about_me_expanded} />
  ) : null;

  const affiliationBadges = affiliations && affiliations.length > 0 ? (
    <div className={`flex flex-wrap gap-1.5 mb-3 ${layoutVariant === 'centered' ? 'justify-center' : ''}`}>
      {affiliations.map((a) => (
        <AffiliationBadge key={a.id} {...a} />
      ))}
    </div>
  ) : null;

  // Centered layout
  if (layoutVariant === 'centered') {
    return (
      <div className="text-center">
        <div className="mx-auto w-fit">{avatar}</div>
        {nameBlock}
        {affiliationBadges}
        {bioBlock}
        {aboutBlock}
      </div>
    );
  }

  // Sidebar layout — vertically stacked, left-aligned for narrow 280px column
  if (layoutVariant === 'sidebar') {
    return (
      <div>
        {avatar}
        {nameBlock}
        {affiliationBadges}
        {bioBlock}
        {aboutBlock}
      </div>
    );
  }

  // Side-by-side layouts — visible from sm (640px) up
  const isLeft = layoutVariant === 'left-photo';

  return (
    <div>
      <div className={`flex flex-row items-start gap-4 ${isLeft ? '' : 'flex-row-reverse'}`}>
        <div className="shrink-0">{avatar}</div>
        <div className={`text-left ${!isLeft ? 'text-right' : ''} flex-1 min-w-0 pt-2`}>
          {nameBlock}
          {affiliationBadges}
          {bioBlock}
          {aboutBlock}
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible "About Me" section on the public page.
 * Starts collapsed — visitor taps to expand.
 */
/** Allowed HTML tags for the about_me rich text. Strips everything else. */
function sanitizeAboutHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const ALLOWED_TAGS = new Set([
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
  ]);
  const ALLOWED_ATTRS: Record<string, Set<string>> = {
    a: new Set(['href', 'target', 'rel']),
  };

  function walk(node: Node): void {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          // Replace with its children
          while (el.firstChild) el.parentNode!.insertBefore(el.firstChild, el);
          el.remove();
        } else {
          // Strip disallowed attributes
          const allowed = ALLOWED_ATTRS[tag] ?? new Set();
          for (const attr of Array.from(el.attributes)) {
            if (!allowed.has(attr.name)) el.removeAttribute(attr.name);
          }
          // Force safe link attributes
          if (tag === 'a') {
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener noreferrer nofollow');
          }
          walk(el);
        }
      }
    }
  }

  walk(tmp);
  return tmp.innerHTML;
}

function AboutMeSection({ text, centered, defaultExpanded }: { text: string; centered: boolean; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Detect if content is HTML (from rich text editor) or plain text (legacy)
  const isHtml = text.includes('<');
  const safeHtml = isHtml ? sanitizeAboutHtml(text) : null;

  return (
    <div className={`mb-5 ${centered ? 'max-w-sm mx-auto' : 'max-w-sm'}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs font-medium transition-opacity duration-150 hover:opacity-80"
        style={{ color: 'var(--page-accent, var(--page-text))', opacity: 0.7 }}
      >
        About me
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? '600px' : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        {safeHtml ? (
          <div
            className="about-me-content text-sm leading-[1.7] mt-2"
            style={{ opacity: 0.6 }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <p
            className="text-sm leading-[1.7] mt-2 whitespace-pre-line"
            style={{ opacity: 0.6 }}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
