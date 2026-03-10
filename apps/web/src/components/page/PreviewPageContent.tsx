import type { BioPage, Link as LinkType, SocialLink, ContentBlock, ContentBlockType, EmbedBlock, LayoutVariant, ButtonStyle } from '@bytlinks/shared';
import { PageHero } from './PageHero';
import { PageLinks } from './PageLinks';
import { PageEmbeds } from './PageEmbeds';
import { blockRendererRegistry } from './blocks/blockRendererRegistry';
import { resolveButtonStyle } from '../../utils/styleDefaults';
import logoOnlySrc from '../../logo/BytLinks_logo_only.png';

interface PreviewHeroProps {
  page: BioPage;
  layoutVariant?: LayoutVariant;
}

/**
 * Renders the hero (avatar, name, bio, about-me) using the real PageHero
 * with lightbox disabled for safe preview rendering.
 */
export function PreviewHero({ page, layoutVariant = 'centered' }: PreviewHeroProps) {
  return (
    <PageHero
      page={page}
      username={page.username}
      layoutVariant={layoutVariant}
      disableLightbox
    />
  );
}

interface PreviewSectionsProps {
  page: BioPage;
  links: LinkType[];
  socialLinks: SocialLink[];
  blocks: ContentBlock[];
  embeds?: EmbedBlock[];
  layoutVariant?: LayoutVariant;
  /** Override links rendering for interactive mode (appearance editor). */
  renderLinks?: (links: LinkType[], buttonStyle: ButtonStyle) => React.ReactNode;
  /** Show placeholder blocks when no visible links. */
  showPlaceholders?: boolean;
}

/**
 * Renders all page sections following section_order.
 * Uses the real PageSocials, PageLinks, and block renderers from blockRendererRegistry.
 * This ensures preview rendering is identical to the public page.
 */
export function PreviewSections({
  page, links, socialLinks: _socialLinks, blocks, embeds,
  layoutVariant: _layoutVariant = 'centered',
  renderLinks,
  showPlaceholders,
}: PreviewSectionsProps) {
  const sectionOrder = page.section_order ?? ['social_links', 'links'];
  const blockMap = new Map(blocks.map((b) => [b.id, b]));
  const btnStyle = resolveButtonStyle(page.theme);

  return (
    <>
      {sectionOrder.map((entry) => {
        if (entry === 'social_links') return null;

        if (entry === 'links') {
          if (renderLinks) {
            return (
              <div key="links">
                {renderLinks(links, btnStyle)}
                {embeds && embeds.length > 0 && <PageEmbeds embeds={embeds} />}
              </div>
            );
          }
          const visibleLinks = links.filter((l) => l.is_visible);
          return (
            <div key="links">
              <PageLinks links={links} buttonStyle={btnStyle} />
              {embeds && <PageEmbeds embeds={embeds} />}
              {showPlaceholders && visibleLinks.length === 0 && (
                <div className="space-y-3">
                  <div className="w-full h-12 rounded-lg" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }} />
                  <div className="w-full h-12 rounded-lg" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }} />
                  <div className="w-full h-12 rounded-lg" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }} />
                </div>
              )}
            </div>
          );
        }

        if (entry.startsWith('block:')) {
          const block = blockMap.get(entry.slice(6));
          if (!block || !block.is_visible) return null;
          const Renderer = blockRendererRegistry[block.block_type as ContentBlockType];
          if (!Renderer) return null;
          return <Renderer key={entry} block={block} />;
        }

        return null;
      })}
    </>
  );
}

/**
 * "Powered by BytLinks" badge for previews.
 */
export function PreviewBadge() {
  return (
    <div className="flex items-center justify-center gap-1 opacity-30 mt-8" style={{ color: 'var(--page-text)' }}>
      <img src={logoOnlySrc} alt="" className="h-3 w-3" />
      <span className="text-[10px]">Powered by BytLinks</span>
    </div>
  );
}
