import { useRef } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { ScheduleData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function getEmbedUrl(calendarUrl: string): string | null {
  try {
    const url = new URL(calendarUrl);
    if (url.hostname.includes('calendly.com')) {
      return calendarUrl;
    }
    if (url.hostname.includes('cal.com')) {
      return calendarUrl;
    }
    return calendarUrl;
  } catch {
    return null;
  }
}

export function ScheduleRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as ScheduleData;
  const trackedRef = useRef(false);
  if (!data.calendar_url) return null;

  const embedUrl = getEmbedUrl(data.calendar_url);
  if (!embedUrl) return null;

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
      <iframe
        src={embedUrl}
        title="Schedule"
        className="w-full border-0"
        style={{ height: 400 }}
        loading="lazy"
      />
    </div>
  );
}
