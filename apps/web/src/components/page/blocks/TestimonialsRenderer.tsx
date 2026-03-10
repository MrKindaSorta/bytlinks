import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { TestimonialsData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

export function TestimonialsRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as TestimonialsData;
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const touchStartRef = useRef<number | null>(null);
  const trackedRef = useRef(false);

  function handleNavigate() {
    if (!trackedRef.current && pageId) {
      trackedRef.current = true;
      trackEvent(pageId, 'testimonial_navigate', { blockId: block.id });
    }
  }

  function goTo(newIndex: number) {
    if (transitioning) return;
    handleNavigate();
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(newIndex);
      setTransitioning(false);
    }, 200);
  }

  function prev() {
    goTo((current - 1 + data.items.length) % data.items.length);
  }

  function next() {
    goTo((current + 1) % data.items.length);
  }

  // Autoplay — pause on hover
  useEffect(() => {
    if (!autoplay || !data.items || data.items.length <= 1) return;
    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((i) => (i + 1) % data.items.length);
        setTransitioning(false);
      }, 200);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoplay, data.items?.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = e.touches[0].clientX;
    setAutoplay(false);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    touchStartRef.current = null;
  }

  if (!data.items?.length) return null;

  const item = data.items[current];

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-5 text-center relative"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
      onMouseEnter={() => setAutoplay(false)}
      onMouseLeave={() => setAutoplay(true)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {block.title && (
        <h3
          className="text-base font-bold tracking-tight mb-3"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      <Quote className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--page-accent)', opacity: 0.4 }} />
      <div
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(4px)' : 'translateY(0)',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
      >
        <blockquote
          className="text-sm leading-relaxed italic max-w-lg mx-auto"
          style={{ color: 'var(--page-text)' }}
        >
          &ldquo;{item.quote}&rdquo;
        </blockquote>
        <div className="mt-3 flex items-center justify-center gap-2">
          {item.avatar_r2_key && (
            <img
              src={`/api/public/file/${item.avatar_r2_key}`}
              alt={item.author}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--page-text)' }}>{item.author}</p>
            {item.role && (
              <p className="text-[10px]" style={{ color: 'var(--page-text)', opacity: 0.5 }}>{item.role}</p>
            )}
          </div>
        </div>
      </div>
      {data.items.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => { setAutoplay(false); prev(); }}
            className="p-1 transition-opacity duration-150 hover:opacity-100"
            style={{ color: 'var(--page-text)', opacity: 0.5 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {data.items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setAutoplay(false); goTo(i); }}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === current ? 16 : 6,
                  height: 6,
                  background: i === current ? 'var(--page-accent)' : 'var(--page-border, rgba(128,128,128,0.2))',
                }}
              />
            ))}
          </div>
          <button
            onClick={() => { setAutoplay(false); next(); }}
            className="p-1 transition-opacity duration-150 hover:opacity-100"
            style={{ color: 'var(--page-text)', opacity: 0.5 }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
