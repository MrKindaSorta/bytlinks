import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { FaqData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, answer]);

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: 'var(--page-surface-alt, rgba(128,128,128,0.15))' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-left group"
        style={{ color: 'var(--page-text)' }}
      >
        <span className="text-sm font-medium pr-4">{question}</span>
        <ChevronDown
          className="w-4 h-4 shrink-0"
          style={{
            opacity: 0.5,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>
      <div
        ref={contentRef}
        style={{
          height: `${height}px`,
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
        }}
      >
        <p className="text-sm leading-relaxed pb-3" style={{ color: 'var(--page-text)', opacity: 0.65 }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

export function FaqRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as FaqData;
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  if (!data.items?.length) return null;

  const showSearch = data.show_search && data.items.length > 5;

  const filteredItems = showSearch && searchQuery.trim()
    ? data.items.filter((item) => {
        const q = searchQuery.toLowerCase();
        return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
      })
    : data.items;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (pageId) trackEvent(pageId, 'faq_expand', { blockId: block.id });
      }
      return next;
    });
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-2"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      {block.title && (
        <h3
          className="text-base font-bold tracking-tight pt-3 pb-1"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      {showSearch && (
        <div className="relative mt-2 mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--page-text)', opacity: 0.4 }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={data.search_placeholder || 'Search questions…'}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm bg-transparent border focus:outline-none"
            style={{
              color: 'var(--page-text)',
              borderColor: 'var(--page-surface-alt, rgba(128,128,128,0.2))',
            }}
          />
        </div>
      )}
      {filteredItems.length > 0 ? (
        filteredItems.map((item) => (
          <FaqItem
            key={item.id}
            question={item.question}
            answer={item.answer}
            isOpen={openIds.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))
      ) : (
        <p
          className="text-sm py-4 text-center"
          style={{ color: 'var(--page-text)', opacity: 0.5 }}
        >
          No results for &ldquo;{searchQuery}&rdquo;
        </p>
      )}
    </div>
  );
}
