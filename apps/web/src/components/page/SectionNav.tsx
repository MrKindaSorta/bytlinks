import { useEffect, useRef, useState } from 'react';
import type { ContentSection, SectionNavPosition } from '@bytlinks/shared';

interface SectionNavProps {
  sections: ContentSection[];
  activeId: string;
  onSelect: (id: string) => void;
  position: SectionNavPosition;
}

export function SectionNav({ sections, activeId, onSelect, position }: SectionNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector(`[data-section-id="${activeId}"]`) as HTMLElement | null;
    if (!activeBtn) return;
    setIndicatorStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [activeId, sections]);

  const isBottom = position === 'bottom';

  return (
    <div
      className={`${isBottom ? 'fixed bottom-0 left-0 right-0 z-40' : 'sticky top-0 z-30'}`}
      style={{
        background: 'var(--page-bg)',
        borderBottom: isBottom ? 'none' : '1px solid var(--page-surface-alt, rgba(128,128,128,0.15))',
        borderTop: isBottom ? '1px solid var(--page-surface-alt, rgba(128,128,128,0.15))' : 'none',
        paddingBottom: isBottom ? 'env(safe-area-inset-bottom, 0px)' : undefined,
      }}
    >
      <div
        ref={navRef}
        className="relative flex overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            data-section-id={section.id}
            onClick={() => onSelect(section.id)}
            className="shrink-0 px-4 py-3 font-body text-sm font-medium transition-opacity duration-150 whitespace-nowrap"
            style={{
              color: 'var(--page-text)',
              opacity: activeId === section.id ? 1 : 0.5,
            }}
          >
            {section.label}
          </button>
        ))}
        {/* Active indicator */}
        <div
          className="absolute bottom-0 h-0.5 transition-all duration-200"
          style={{
            background: 'var(--page-accent, var(--page-text))',
            ...indicatorStyle,
          }}
        />
      </div>
    </div>
  );
}
