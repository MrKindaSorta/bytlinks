import { useRef, useEffect, useState, useCallback } from 'react';
import type { SectionsConfig, ContentBlock, ContentBlockType } from '@bytlinks/shared';
import type { Link as LinkType, EmbedBlock, ButtonStyle } from '@bytlinks/shared';
import { SectionNav } from './SectionNav';
import { PageLinks } from './PageLinks';
import { PageEmbeds } from './PageEmbeds';
import { blockRendererRegistry } from './blocks/blockRendererRegistry';

interface SectionsRendererProps {
  config: SectionsConfig;
  links: LinkType[];
  embeds: EmbedBlock[];
  blocks: ContentBlock[];
  buttonStyle: ButtonStyle;
  pageId: string;
}

function renderSectionItems(
  items: string[],
  links: LinkType[],
  embeds: EmbedBlock[],
  blocks: ContentBlock[],
  buttonStyle: ButtonStyle,
  pageId: string,
) {
  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  return items.map((item) => {
    if (item === 'links') {
      return (
        <div key="links">
          <PageLinks links={links} buttonStyle={buttonStyle} pageId={pageId} />
          <PageEmbeds embeds={embeds} />
        </div>
      );
    }
    if (item.startsWith('block:')) {
      const block = blockMap.get(item.slice(6));
      if (!block || !block.is_visible) return null;
      const Renderer = blockRendererRegistry[block.block_type as ContentBlockType];
      if (!Renderer) return null;
      return <Renderer key={item} block={block} pageId={pageId} />;
    }
    return null;
  });
}

export function SectionsRenderer({
  config,
  links,
  embeds,
  blocks,
  buttonStyle,
  pageId,
}: SectionsRendererProps) {
  const { mode, navPosition, sections } = config;
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    if (mode === 'anchor') {
      const el = sectionRefs.current.get(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [mode]);

  // Anchor mode: observe scroll position to update active section
  useEffect(() => {
    if (mode !== 'anchor') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            if (id) setActiveId(id);
          }
        }
      },
      { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' },
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mode, sections]);

  const nav = sections.length > 1 ? (
    <SectionNav
      sections={sections}
      activeId={activeId}
      onSelect={handleSelect}
      position={navPosition}
    />
  ) : null;

  if (mode === 'paginated') {
    const activeSection = sections.find((s) => s.id === activeId) ?? sections[0];
    return (
      <>
        {nav}
        <div className="py-4" style={{ paddingBottom: navPosition === 'bottom' ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined }}>
          {activeSection && renderSectionItems(activeSection.items, links, embeds, blocks, buttonStyle, pageId)}
        </div>
      </>
    );
  }

  // Anchor mode
  return (
    <>
      {nav}
      <div className="space-y-8 py-4">
        {sections.map((section) => (
          <div
            key={section.id}
            data-section-id={section.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(section.id, el);
              else sectionRefs.current.delete(section.id);
            }}
          >
            {sections.length > 1 && (
              <h3
                className="font-display text-lg font-700 tracking-tight mb-4"
                style={{ color: 'var(--page-text)' }}
              >
                {section.label}
              </h3>
            )}
            {renderSectionItems(section.items, links, embeds, blocks, buttonStyle, pageId)}
          </div>
        ))}
      </div>
    </>
  );
}
