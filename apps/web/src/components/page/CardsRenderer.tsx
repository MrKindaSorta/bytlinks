import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SectionsConfig, ContentBlock, ContentBlockType } from '@bytlinks/shared';
import type { Link as LinkType, EmbedBlock, ButtonStyle } from '@bytlinks/shared';
import { CardDots } from './CardDots';
import { PageLinks } from './PageLinks';
import { PageEmbeds } from './PageEmbeds';
import { blockRendererRegistry } from './blocks/blockRendererRegistry';

interface CardsRendererProps {
  config: SectionsConfig;
  links: LinkType[];
  embeds: EmbedBlock[];
  blocks: ContentBlock[];
  buttonStyle: ButtonStyle;
  pageId: string;
}

function renderCardContent(
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

export function CardsRenderer({
  config,
  links,
  embeds,
  blocks,
  buttonStyle,
  pageId,
}: CardsRendererProps) {
  const { sections } = config;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const total = sections.length;

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(total - 1, index)));
  }, [total]);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Only horizontal swipes
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card content */}
      <div className="min-h-[60vh] flex flex-col justify-start overflow-y-auto">
        {sections[activeIndex] && renderCardContent(
          sections[activeIndex].items,
          links,
          embeds,
          blocks,
          buttonStyle,
          pageId,
        )}
      </div>

      {/* Desktop arrows */}
      <div className="hidden md:block">
        {activeIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-opacity duration-150 hover:opacity-70"
            style={{
              background: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
              color: 'var(--page-text)',
            }}
            aria-label="Previous card"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {activeIndex < total - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-opacity duration-150 hover:opacity-70"
            style={{
              background: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
              color: 'var(--page-text)',
            }}
            aria-label="Next card"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress dots */}
      <CardDots count={total} active={activeIndex} onDotClick={goTo} />
    </div>
  );
}
