import { useRef, useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { CalendarData, CalendarMode, CalendarProvider } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function normalizeCalendarData(data: Record<string, unknown>): CalendarData {
  return {
    url: (data.url || data.booking_url || data.calendar_url || '') as string,
    mode: (data.mode || (data.booking_url ? 'book' : 'view')) as CalendarMode,
    provider: (data.provider || undefined) as CalendarProvider | undefined,
  };
}

function detectProvider(url: string): CalendarProvider {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('calendly.com')) return 'calendly';
    if (hostname.includes('cal.com')) return 'cal';
    if (hostname.includes('calendar.google.com')) return 'google';
  } catch { /* ignore */ }
  return 'other';
}

function getEmbedSrc(url: string, provider: CalendarProvider): string {
  if (provider === 'cal') {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}embed=true`;
  }
  return url;
}

export function CalendarRenderer({ block, pageId }: BlockRendererProps) {
  const rawData = block.data as Record<string, unknown>;
  const data = normalizeCalendarData(rawData);
  const trackedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!data.url) return null;

  const provider = data.provider || detectProvider(data.url);
  const mode = data.mode || (provider === 'google' ? 'view' : 'book');
  const embedSrc = getEmbedSrc(data.url, provider);
  const height = mode === 'book' ? 500 : 400;

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded) setErrored(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loaded]);

  function handleInteract() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    // Use legacy event type for old block types, new type for calendar
    const eventType = block.block_type === 'booking' ? 'booking_click'
      : block.block_type === 'schedule' ? 'schedule_click'
      : 'calendar_interact';
    trackEvent(pageId, eventType, { blockId: block.id });
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl overflow-hidden"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
        border: '1px solid var(--page-accent)',
      }}
      onMouseDown={handleInteract}
      onTouchStart={handleInteract}
    >
      {block.title && (
        <h3
          className="text-sm font-bold px-4 pt-3"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      <div className="relative" style={{ height }}>
        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'var(--page-border, rgba(128,128,128,0.2))',
                borderTopColor: 'var(--page-accent)',
              }}
            />
          </div>
        )}
        {errored && !loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
              Unable to load calendar widget
            </p>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--page-accent)' }}
            >
              Open calendar page <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        <iframe
          src={embedSrc}
          title={mode === 'book' ? 'Book a call' : 'Calendar'}
          className="w-full h-full border-0"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 300ms ease' }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
