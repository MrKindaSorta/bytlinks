import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, CalendarDays, Calendar } from 'lucide-react';
import type { ContentBlock, BookingData, ScheduleData, CalendarData, CalendarMode, CalendarProvider } from '@bytlinks/shared';

function normalizeCalendarData(data: Record<string, unknown>): CalendarData {
  return {
    url: (data.url || data.booking_url || data.calendar_url || '') as string,
    mode: (data.mode || (data.booking_url ? 'book' : 'view')) as CalendarMode,
    provider: (data.provider || undefined) as CalendarProvider | undefined,
  };
}

interface BookingSummary {
  booking_clicks: number;
  schedule_clicks: number;
}

interface ManageBookingsProps {
  blocks: ContentBlock[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: create temp input
      const el = document.createElement('input');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-body text-xs font-medium px-2.5 py-1 rounded-lg
                 bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text
                 transition-colors duration-fast"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy Link
        </>
      )}
    </button>
  );
}

export function ManageBookings({ blocks }: ManageBookingsProps) {
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const calendarBlocks = blocks.filter((b) => b.block_type === 'calendar');
  const bookingBlocks = blocks.filter((b) => b.block_type === 'booking');
  const scheduleBlocks = blocks.filter((b) => b.block_type === 'schedule');

  useEffect(() => {
    setLoadingSummary(true);
    fetch('/api/analytics/booking-summary', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSummary(json.data);
      })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, []);

  if (calendarBlocks.length === 0 && bookingBlocks.length === 0 && scheduleBlocks.length === 0) {
    return (
      <div className="max-w-xl">
        <p className="font-body text-sm text-brand-text-muted">
          Add a Booking or Schedule block to manage it here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Analytics summary */}
      {!loadingSummary && summary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-brand-surface-alt border border-brand-border px-5 py-4">
            <p className="font-body text-xs text-brand-text-muted mb-1">Booking clicks (30 days)</p>
            <p className="font-display text-2xl font-bold text-brand-text">{summary.booking_clicks}</p>
          </div>
          <div className="rounded-xl bg-brand-surface-alt border border-brand-border px-5 py-4">
            <p className="font-body text-xs text-brand-text-muted mb-1">Schedule interactions (30 days)</p>
            <p className="font-display text-2xl font-bold text-brand-text">{summary.schedule_clicks}</p>
          </div>
        </div>
      )}

      {/* Calendar blocks (new consolidated type) */}
      {calendarBlocks.length > 0 && (
        <section>
          <h2 className="font-display text-base font-bold text-brand-text mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendar Widgets
          </h2>
          <div className="space-y-3">
            {calendarBlocks.map((block) => {
              const data = normalizeCalendarData(block.data as Record<string, unknown>);
              const url = data.url;
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-brand-text truncate">
                      {block.title || 'Calendar Widget'}
                    </p>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-body text-xs text-brand-accent hover:opacity-80 transition-opacity truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    )}
                  </div>
                  {url && <CopyButton text={url} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Booking blocks */}
      {bookingBlocks.length > 0 && (
        <section>
          <h2 className="font-display text-base font-bold text-brand-text mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Booking Widgets
          </h2>
          <div className="space-y-3">
            {bookingBlocks.map((block) => {
              const data = block.data as BookingData;
              const url = data.booking_url;
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-brand-text truncate">
                      {block.title || 'Booking Widget'}
                    </p>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-body text-xs text-brand-accent hover:opacity-80 transition-opacity truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    )}
                  </div>
                  {url && <CopyButton text={url} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Schedule blocks */}
      {scheduleBlocks.length > 0 && (
        <section>
          <h2 className="font-display text-base font-bold text-brand-text mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Widgets
          </h2>
          <div className="space-y-3">
            {scheduleBlocks.map((block) => {
              const data = block.data as ScheduleData;
              const url = data.calendar_url;
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-brand-text truncate">
                      {block.title || 'Schedule Widget'}
                    </p>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-body text-xs text-brand-accent hover:opacity-80 transition-opacity truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    )}
                  </div>
                  {url && <CopyButton text={url} />}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
