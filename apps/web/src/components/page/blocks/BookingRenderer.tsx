import { useRef } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { BookingData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function detectProvider(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('calendly.com')) return 'calendly';
    if (hostname.includes('cal.com')) return 'cal';
  } catch { /* ignore */ }
  return 'other';
}

function getEmbedSrc(url: string, provider: string): string {
  if (provider === 'calendly') {
    // Calendly inline embed URL works as-is in an iframe
    return url;
  }
  if (provider === 'cal') {
    // Cal.com embed: append ?embed=true for clean inline rendering
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}embed=true`;
  }
  return url;
}

export function BookingRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as BookingData;
  const trackedRef = useRef(false);
  if (!data.booking_url) return null;

  const provider = data.provider || detectProvider(data.booking_url);
  const embedSrc = getEmbedSrc(data.booking_url, provider);

  function handleInteract() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    trackEvent(pageId, 'booking_click', { blockId: block.id });
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
      <iframe
        src={embedSrc}
        title="Book a call"
        className="w-full border-0"
        style={{ height: 500 }}
        loading="lazy"
      />
    </div>
  );
}
