import { useEffect, useRef, useState } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { StatsData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function isNumeric(value: string): boolean {
  return /^[\d,.]+/.test(value);
}

function parseStatValue(value: string): { prefix: string; number: string; suffix: string } | null {
  // Match optional prefix (non-digit), digits (with commas/dots), and suffix
  const match = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], number: match[2], suffix: match[3] };
}

function AnimatedNumber({ value, animate }: { value: string; animate: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parsed = parseStatValue(value);
  const shouldAnimate = animate && parsed && isNumeric(parsed.number);
  const [display, setDisplay] = useState(shouldAnimate ? `${parsed!.prefix}0${parsed!.suffix}` : value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!shouldAnimate || hasAnimated.current || !ref.current || !parsed) {
      setDisplay(value);
      return;
    }

    const cleanNum = parsed.number.replace(/,/g, '');
    const target = parseFloat(cleanNum);
    if (isNaN(target)) {
      setDisplay(value);
      return;
    }

    const hasCommas = parsed.number.includes(',');
    const decimals = cleanNum.includes('.') ? cleanNum.split('.')[1].length : 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        observer.disconnect();

        const duration = 1200;
        const start = performance.now();

        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;

          let formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();
          if (hasCommas) {
            const parts = formatted.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            formatted = parts.join('.');
          }

          setDisplay(`${parsed!.prefix}${formatted}${parsed!.suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, animate]);

  return <span ref={ref}>{display}</span>;
}

export function StatsRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as StatsData;
  const trackedRef = useRef(false);

  // Track stats view once
  useEffect(() => {
    if (!trackedRef.current && pageId) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !trackedRef.current) {
            trackedRef.current = true;
            trackEvent(pageId, 'stats_view' as never, { blockId: block.id });
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      const el = document.querySelector(`[data-block-id="${block.id}"]`);
      if (el) observer.observe(el);
      return () => observer.disconnect();
    }
  }, [pageId, block.id]);

  if (!data.items || data.items.length === 0) return null;

  const items = data.items.slice(0, 6);
  const animate = data.animate !== false;

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-5"
      data-block-id={block.id}
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      {block.title && (
        <h3
          className="text-sm font-bold mb-4 text-center"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: items.length <= 3
            ? `repeat(${items.length}, 1fr)`
            : 'repeat(2, 1fr)',
        }}
      >
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div
              className="text-2xl font-bold tabular-nums"
              style={{
                color: 'var(--page-accent)',
                fontFamily: 'var(--page-font-display)',
              }}
            >
              <AnimatedNumber value={item.value} animate={animate} />
            </div>
            <div
              className="text-xs mt-1 uppercase tracking-wider"
              style={{ color: 'var(--page-text)', opacity: 0.6 }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
