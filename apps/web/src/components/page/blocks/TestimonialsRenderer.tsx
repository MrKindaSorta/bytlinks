import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { TestimonialsData, TestimonialItem } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

/** Inline SVG star — filled or empty */
function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/** Star rating row — renders 1–5 stars */
function StarRating({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <div className="flex items-center justify-center gap-0.5 mb-1.5" style={{ color: 'var(--page-accent)' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= clamped} />
      ))}
    </div>
  );
}

/** Source badge config */
const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  google: { label: 'Google', color: '#4285F4' },
  trustpilot: { label: 'Trustpilot', color: '#00B67A' },
  twitter: { label: 'X', color: '#000000' },
};

function SourceBadge({ item }: { item: TestimonialItem }) {
  if (!item.source || item.source === 'manual') return null;
  const config = SOURCE_CONFIG[item.source];
  if (!config) return null;

  const badge = (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ background: config.color, color: '#fff' }}
    >
      {config.label}
    </span>
  );

  if (item.source_url) {
    return (
      <a
        href={item.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-1"
      >
        {badge}
      </a>
    );
  }

  return <span className="inline-block mt-1">{badge}</span>;
}

export function TestimonialsRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as TestimonialsData;
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [autoplayActive, setAutoplayActive] = useState(true);
  const touchStartRef = useRef<number | null>(null);
  const trackedRef = useRef(false);

  // Resolve settings with safe defaults (blocks saved before sprint 8 lack these fields)
  const autoplayEnabled = data.autoplay !== false;
  const autoplayInterval = data.autoplay_interval ?? 5000;
  const showSourceBadge = data.show_source_badge !== false;
  const showRatingStars = data.show_rating_stars !== false;

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
    if (!autoplayEnabled || !autoplayActive || !data.items || data.items.length <= 1) return;
    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((i) => (i + 1) % data.items.length);
        setTransitioning(false);
      }, 200);
    }, autoplayInterval);
    return () => clearInterval(interval);
  }, [autoplayEnabled, autoplayActive, data.items?.length, autoplayInterval]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = e.touches[0].clientX;
    setAutoplayActive(false);
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
      onMouseEnter={() => setAutoplayActive(false)}
      onMouseLeave={() => setAutoplayActive(true)}
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
        {/* Star rating */}
        {showRatingStars && item.rating != null && (
          <StarRating rating={item.rating} />
        )}

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

        {/* Source badge */}
        {showSourceBadge && item.source && item.source !== 'manual' && (
          <div className="mt-2">
            <SourceBadge item={item} />
          </div>
        )}
      </div>
      {data.items.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => { setAutoplayActive(false); prev(); }}
            className="p-1 transition-opacity duration-150 hover:opacity-100"
            style={{ color: 'var(--page-text)', opacity: 0.5 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {data.items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setAutoplayActive(false); goTo(i); }}
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
            onClick={() => { setAutoplayActive(false); next(); }}
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
