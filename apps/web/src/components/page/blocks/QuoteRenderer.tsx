import { useEffect, useRef } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { QuoteData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

export function QuoteRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as QuoteData;
  const trackedRef = useRef(false);
  const elRef = useRef<HTMLDivElement>(null);

  // Track quote view via IntersectionObserver
  useEffect(() => {
    if (!pageId || trackedRef.current || !elRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !trackedRef.current) {
          trackedRef.current = true;
          trackEvent(pageId, 'quote_view', { blockId: block.id });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(elRef.current);
    return () => observer.disconnect();
  }, [pageId, block.id]);

  if (!data.text) return null;

  const baseClass = 'scroll-reveal my-6';

  if (data.style === 'centered') {
    return (
      <div ref={elRef} className={`${baseClass} text-center px-6 py-5`}>
        <blockquote
          className="text-lg font-medium leading-relaxed italic"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          &ldquo;{data.text}&rdquo;
        </blockquote>
        {data.attribution && (
          <p className="mt-2 text-sm opacity-60" style={{ color: 'var(--page-text)' }}>
            &mdash; {data.attribution}
          </p>
        )}
      </div>
    );
  }

  if (data.style === 'highlight') {
    return (
      <div
        ref={elRef}
        className={`${baseClass} rounded-xl px-5 py-4`}
        style={{ background: 'var(--page-accent)', color: 'var(--page-bg)' }}
      >
        <blockquote className="text-sm font-medium leading-relaxed">
          {data.text}
        </blockquote>
        {data.attribution && (
          <p className="mt-2 text-xs opacity-70">&mdash; {data.attribution}</p>
        )}
      </div>
    );
  }

  if (data.style === 'minimal') {
    return (
      <div ref={elRef} className={`${baseClass} py-3`}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--page-text)', opacity: 0.8 }}>
          {data.text}
        </p>
        {data.attribution && (
          <p className="mt-1.5 text-xs opacity-50" style={{ color: 'var(--page-text)' }}>
            &mdash; {data.attribution}
          </p>
        )}
      </div>
    );
  }

  // callout (default)
  return (
    <div
      ref={elRef}
      className={`${baseClass} rounded-xl px-5 py-4 border-l-4`}
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
        borderColor: 'var(--page-accent)',
      }}
    >
      <blockquote className="text-sm font-medium leading-relaxed" style={{ color: 'var(--page-text)' }}>
        {data.text}
      </blockquote>
      {data.attribution && (
        <p className="mt-2 text-xs opacity-60" style={{ color: 'var(--page-text)' }}>
          &mdash; {data.attribution}
        </p>
      )}
    </div>
  );
}
