import { useRef, useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { ScheduleData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function getEmbedUrl(calendarUrl: string): string | null {
  try {
    new URL(calendarUrl);
    return calendarUrl;
  } catch {
    return null;
  }
}

export function ScheduleRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as ScheduleData;
  const trackedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!data.calendar_url) return null;

  const embedUrl = getEmbedUrl(data.calendar_url);
  if (!embedUrl) return null;

  // Timeout fallback for iframe load detection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded) setErrored(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loaded]);

  function handleInteract() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    trackEvent(pageId, 'schedule_click', { blockId: block.id });
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl overflow-hidden"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
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
      <div className="relative" style={{ height: 400 }}>
        {/* Loading spinner */}
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
        {/* Error state */}
        {errored && !loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
              Unable to load schedule widget
            </p>
            <a
              href={data.calendar_url}
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
          src={embedUrl}
          title="Schedule"
          className="w-full h-full border-0"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 300ms ease' }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
