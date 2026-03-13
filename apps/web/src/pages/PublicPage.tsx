import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronDown, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageHead } from '../components/PageHead';
import type { BioPage, Link as LinkType, SocialLink, EmbedBlock, ContentBlock, ContentBlockType, Theme, AffiliationBadgeData, TeamMemberData } from '@bytlinks/shared';
import { resolveBlockColumnSpan } from '@bytlinks/shared/constants';
import { PageShell } from '../components/page/PageShell';
import { PageHero } from '../components/page/PageHero';
import { PageLinks } from '../components/page/PageLinks';
import { PageEmbeds } from '../components/page/PageEmbeds';
import { PageSocials } from '../components/page/PageSocials';
import { PageContactInfo } from '../components/page/PageContactInfo';
import { PageBadge } from '../components/page/PageBadge';
import { SectionsRenderer } from '../components/page/SectionsRenderer';
import { CardsRenderer } from '../components/page/CardsRenderer';
import { blockRendererRegistry } from '../components/page/blocks/blockRendererRegistry';
import { TeamSection } from '../components/page/TeamSection';
import { resolveButtonStyle, resolveLayoutVariant, resolveContentDisplay, resolveDesktopLayoutVariant, resolveDesktopContentDisplay, resolveTwoColumnDesktop, resolveContainerWidth, resolveGridGap } from '../utils/styleDefaults';

interface PageData {
  page: BioPage;
  links: LinkType[];
  socialLinks: SocialLink[];
  embeds: EmbedBlock[];
  blocks: ContentBlock[];
  verified?: boolean;
  affiliations?: AffiliationBadgeData[];
  teamMembers?: TeamMemberData[];
}

/** Fire a page_view analytics event (fire-and-forget). */
function trackPageView(pageId: string) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id: pageId, event_type: 'page_view' }),
    keepalive: true,
  }).catch(() => {});
}

/* ── Spotlight scroll indicator ── */

function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 animate-bounce">
      <ChevronDown className="w-5 h-5 opacity-40" style={{ color: 'var(--page-text)' }} />
      <span className="text-xs font-medium opacity-30" style={{ color: 'var(--page-text)' }}>
        Scroll for more
      </span>
    </div>
  );
}

/** Determine if a section_order entry is a full-width block type */
function isFullWidthEntry(entry: string, blockMap: Map<string, ContentBlock>): boolean {
  if (entry === 'links') return false;
  if (entry.startsWith('block:')) {
    const block = blockMap.get(entry.slice(6));
    if (!block) return false;
    return resolveBlockColumnSpan(block) === 'full';
  }
  return false;
}

/* ── Main ── */

export default function PublicPage() {
  const { username } = useParams<{ username: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedRef = useRef(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/public/${username}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) { setError(json.error || 'Page not found'); return; }
        setData(json.data);
      })
      .catch(() => setError('Failed to load page'))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (data && !trackedRef.current) {
      trackedRef.current = true;
      trackPageView(data.page.id);
    }
  }, [data]);

  // Page title is handled by <PageHead> in the render output below.

  // Scroll-reveal — observe from the page root so both mobile AND desktop blocks get revealed
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    const elements = root.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-5 h-5 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <PageHead title="404" noIndex />
        <h1 className="font-display text-6xl font-900 tracking-[-0.05em] text-brand-text mb-3">404</h1>
        <p className="font-body text-sm text-brand-text-secondary mb-6">{error || 'This page does not exist.'}</p>
        <a href="/" className="font-body text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150">
          Go to BytLinks
        </a>
      </div>
    );
  }

  const { page, links, socialLinks, embeds, blocks, affiliations, teamMembers } = data;
  const theme: Theme = page.theme;

  const mobileLayout = resolveLayoutVariant(theme);
  const mobileDisplay = resolveContentDisplay(theme);
  const desktopLayout = resolveDesktopLayoutVariant(theme);
  const desktopDisplay = resolveDesktopContentDisplay(theme);
  const twoColumn = resolveTwoColumnDesktop(theme);

  const btnStyle = resolveButtonStyle(theme);
  const blockMap = new Map((blocks || []).map((b) => [b.id, b]));
  const sectionsConfig = theme.sectionsConfig ?? null;
  const showBranding = !!page.show_branding;

  const mobileSocials = socialLinks.length > 0
    ? <PageSocials socialLinks={socialLinks} layoutVariant={mobileLayout} pageId={page.id} />
    : null;
  const desktopSocials = socialLinks.length > 0
    ? <PageSocials socialLinks={socialLinks} layoutVariant={desktopLayout} pageId={page.id} />
    : null;

  const mobileHero = <PageHero page={page} username={username || ''} layoutVariant={mobileLayout} verified={data.verified} affiliations={affiliations} />;
  const desktopHero = <PageHero page={page} username={username || ''} layoutVariant={desktopLayout} verified={data.verified} affiliations={affiliations} />;

  const mobileContact = <PageContactInfo page={page} layoutVariant={mobileLayout} />;
  const desktopContact = <PageContactInfo page={page} layoutVariant={desktopLayout} />;

  const desktopIsSidebar = desktopLayout === 'sidebar';
  const desktopIsSplit = desktopLayout === 'left-photo' || desktopLayout === 'right-photo';
  const desktopIsLeft = desktopLayout === 'left-photo';

  /* ── Flat section_order renderer (used by Flow + Spotlight) ── */

  function renderFlatSections(useTwoColumn: boolean) {
    const order = page.section_order ?? ['social_links', 'links'];

    const items = order.map((entry) => {
      if (entry === 'social_links') return null;
      if (entry === 'links') {
        return (
          <div key="links">
            <PageLinks links={links} buttonStyle={btnStyle} pageId={page.id} />
            <PageEmbeds embeds={embeds} />
          </div>
        );
      }
      if (entry.startsWith('block:')) {
        const block = blockMap.get(entry.slice(6));
        if (!block || !block.is_visible) return null;
        const Renderer = blockRendererRegistry[block.block_type as ContentBlockType];
        if (!Renderer) return null;
        const fullWidth = isFullWidthEntry(entry, blockMap);
        return (
          <div key={entry} style={useTwoColumn && fullWidth ? { gridColumn: '1 / -1' } : undefined}>
            <Renderer block={block} pageId={page.id} />
          </div>
        );
      }
      return null;
    });

    if (useTwoColumn) {
      return (
        <div className={`grid ${resolveGridGap(theme.spacing)} lg:grid-cols-2 [&>div>*]:my-0`}>
          {items}
        </div>
      );
    }

    return <>{items}</>;
  }

  /* ── Sections/Cards content block (just the grouped content, no hero) ── */

  function renderGroupedContent() {
    if (!sectionsConfig) return renderFlatSections(false);

    return (
      <SectionsRenderer
        config={sectionsConfig}
        links={links}
        embeds={embeds}
        blocks={blocks}
        buttonStyle={btnStyle}
        pageId={page.id}
      />
    );
  }

  function renderCardsContent() {
    if (!sectionsConfig) return renderFlatSections(false);

    return (
      <CardsRenderer
        config={sectionsConfig}
        links={links}
        embeds={embeds}
        blocks={blocks}
        buttonStyle={btnStyle}
        pageId={page.id}
      />
    );
  }

  /* ── Mobile content renderer ── */

  function renderMobile() {
    const wrap = (children: React.ReactNode) => (
      <div className="max-w-lg mx-auto px-5 py-10">{children}</div>
    );

    if (mobileDisplay === 'spotlight') {
      return wrap(
        <>
          <div className="min-h-[85vh] flex flex-col justify-center">
            {mobileHero}
            {mobileContact}
            {mobileSocials}
            <ScrollIndicator />
          </div>
          {renderFlatSections(false)}
        </>,
      );
    }

    if (mobileDisplay === 'sections') {
      return wrap(
        <>
          {mobileHero}
          {mobileContact}
          {mobileSocials}
          {renderGroupedContent()}
        </>,
      );
    }

    if (mobileDisplay === 'cards') {
      return wrap(
        <>
          {mobileHero}
          {mobileContact}
          {mobileSocials}
          {renderCardsContent()}
        </>,
      );
    }

    // Flow (default)
    return wrap(
      <>
        {mobileHero}
        {mobileContact}
        {mobileSocials}
        {renderFlatSections(false)}
      </>,
    );
  }

  /* ── Desktop content renderer ── */

  function renderDesktop() {
    const splitGrid = (heroNode: React.ReactNode, contentNode: React.ReactNode) => (
      <div className="max-w-5xl mx-auto px-5 py-16">
        <div className="grid grid-cols-[7fr_13fr] gap-12 items-start">
          <div className={`sticky top-16 self-start ${desktopIsLeft ? 'order-1' : 'order-2'}`}>
            {heroNode}
            {desktopContact}
            {desktopSocials}
          </div>
          <main className={desktopIsLeft ? 'order-2' : 'order-1'}>
            {contentNode}
          </main>
        </div>
      </div>
    );

    const sidebarLayout = (heroNode: React.ReactNode, contentNode: React.ReactNode) => (
      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-[280px_1fr] gap-12 items-start">
          <aside className="sticky top-16 self-start">{heroNode}{desktopContact}{desktopSocials}</aside>
          <main>{contentNode}</main>
        </div>
      </div>
    );

    const containerWidth = resolveContainerWidth(theme);
    const centeredWrap = (children: React.ReactNode) => (
      <main className={`${containerWidth} mx-auto px-5 py-16`}>{children}</main>
    );

    /* ── Spotlight ── */
    if (desktopDisplay === 'spotlight') {
      if (desktopIsSidebar) {
        return sidebarLayout(desktopHero, <div>{renderFlatSections(twoColumn)}</div>);
      }
      if (desktopIsSplit) {
        return splitGrid(desktopHero, <div>{renderFlatSections(twoColumn)}</div>);
      }
      return centeredWrap(
        <>
          <div className="min-h-[85vh] flex flex-col justify-center">
            {desktopHero}
            {desktopContact}
            {desktopSocials}
            <ScrollIndicator />
          </div>
          <div>{renderFlatSections(twoColumn)}</div>
        </>,
      );
    }

    /* ── Sections ── */
    if (desktopDisplay === 'sections') {
      if (desktopIsSidebar) {
        return sidebarLayout(desktopHero, <div>{renderGroupedContent()}</div>);
      }
      if (desktopIsSplit) {
        return splitGrid(desktopHero, <div>{renderGroupedContent()}</div>);
      }
      return centeredWrap(
        <>
          {desktopHero}
          {desktopContact}
          {desktopSocials}
          <div>{renderGroupedContent()}</div>
        </>,
      );
    }

    /* ── Cards ── */
    if (desktopDisplay === 'cards') {
      if (desktopIsSidebar) {
        return sidebarLayout(desktopHero, <div>{renderCardsContent()}</div>);
      }
      if (desktopIsSplit) {
        return splitGrid(desktopHero, <div>{renderCardsContent()}</div>);
      }
      return centeredWrap(
        <>
          {desktopHero}
          {desktopContact}
          {desktopSocials}
          <div>{renderCardsContent()}</div>
        </>,
      );
    }

    /* ── Flow (default) ── */
    if (desktopIsSidebar) {
      return sidebarLayout(desktopHero, <div>{renderFlatSections(twoColumn)}</div>);
    }
    if (desktopIsSplit) {
      return splitGrid(desktopHero, <div>{renderFlatSections(twoColumn)}</div>);
    }
    return centeredWrap(
      <>
        {desktopHero}
        {desktopContact}
        {desktopSocials}
        <div>{renderFlatSections(twoColumn)}</div>
      </>,
    );
  }

  const pageTitle = page.seo_title || page.display_name || `@${username}`;
  const pageDesc = page.seo_description || page.bio || undefined;

  return (
    <PageShell theme={theme}>
      <PageHead title={pageTitle} description={pageDesc || undefined} />
      {isAuthenticated && !authLoading && (
        <Link
          to="/dashboard"
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                     bg-black/60 text-white backdrop-blur-md shadow-lg
                     hover:bg-black/75 transition-all duration-200"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      )}
      <div ref={pageRef}>
        <div className="lg:hidden">
          {renderMobile()}
        </div>
        <div className="hidden lg:block">
          {renderDesktop()}
        </div>
        {teamMembers && teamMembers.length > 0 && (
          <div className="max-w-lg lg:max-w-5xl mx-auto px-5 pb-10">
            <TeamSection teamMembers={teamMembers} />
          </div>
        )}
      </div>
      {showBranding && <PageBadge />}
    </PageShell>
  );
}
