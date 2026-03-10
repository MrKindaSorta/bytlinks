import type { EventType } from '@bytlinks/shared';

/**
 * Fire-and-forget analytics event. Used by public page renderers.
 */
export function trackEvent(pageId: string, eventType: EventType, ids?: { linkId?: string; blockId?: string }) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page_id: pageId,
      link_id: ids?.linkId,
      block_id: ids?.blockId,
      event_type: eventType,
    }),
    keepalive: true,
  }).catch(() => {});
}
