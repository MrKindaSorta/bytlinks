import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, ChevronDown, ExternalLink } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { EventData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

/* ── Date formatting ────────────────────────────────────────── */

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: d.getDate(),
    month: months[d.getMonth()],
    year: d.getFullYear(),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

/* ── Countdown math ─────────────────────────────────────────── */

function getTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

/* ── ICS generation ─────────────────────────────────────────── */

function generateIcsUrl(data: EventData): string {
  const d = new Date(data.event_date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dtStart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const end = new Date(d.getTime() + 3600000);
  const dtEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BytLinks//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${data.event_name.replace(/[,;\\]/g, '')}`,
    `LOCATION:${(data.venue || 'Online').replace(/[,;\\]/g, '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf8,${encodeURIComponent(lines.join('\r\n'))}`;
}

/* ── Date Badge with countdown hover/tap ────────────────────── */

function DateBadge({ dateStr }: { dateStr: string }) {
  const { day, month, year } = formatDate(dateStr);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(getTimeLeft(dateStr));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setShowCountdown(true);
    setCountdown(getTimeLeft(dateStr));
    intervalRef.current = setInterval(() => {
      setCountdown(getTimeLeft(dateStr));
    }, 1000);
  }, [dateStr]);

  const stopCountdown = useCallback(() => {
    setShowCountdown(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleTap() {
    if (showCountdown) stopCountdown();
    else startCountdown();
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-4 shrink-0 cursor-default select-none"
      style={{ background: 'var(--page-accent)', color: 'var(--page-bg)', minWidth: 80 }}
      onMouseEnter={startCountdown}
      onMouseLeave={stopCountdown}
      onClick={handleTap}
    >
      <div className="relative w-full" style={{ minHeight: 56 }}>
        {/* Static date */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: showCountdown && countdown ? 0 : 1,
            transform: showCountdown && countdown ? 'scale(0.9)' : 'scale(1)',
            transition: 'opacity 250ms ease, transform 250ms ease',
          }}
        >
          <span className="text-[10px] uppercase tracking-wider font-medium opacity-80">{month}</span>
          <span
            className="text-3xl font-bold leading-none"
            style={{ fontFamily: 'var(--page-font-display)' }}
          >
            {day}
          </span>
          <span className="text-[10px] opacity-60">{year}</span>
        </div>

        {/* Countdown overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: showCountdown && countdown ? 1 : 0,
            transform: showCountdown && countdown ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 250ms ease, transform 250ms ease',
            pointerEvents: showCountdown ? 'auto' : 'none',
          }}
        >
          {countdown && (
            <>
              <span
                className="text-lg font-bold leading-none tabular-nums"
                style={{ fontFamily: 'var(--page-font-display)' }}
              >
                {countdown.days > 0
                  ? `${countdown.days}d`
                  : `${String(countdown.hours).padStart(2, '0')}h`}
              </span>
              <span className="text-[9px] tabular-nums mt-0.5 opacity-80">
                {countdown.days > 0
                  ? `${countdown.hours}h ${countdown.minutes}m`
                  : `${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s`}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Renderer ──────────────────────────────────────────── */

export function EventRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as EventData;
  const [expanded, setExpanded] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState(0);

  if (!data.event_name || !data.event_date) return null;

  const isPast = new Date(data.event_date).getTime() < Date.now();
  const { time } = formatDate(data.event_date);
  const hasImage = !!data.image_r2_key;
  const eventLinks = data.links?.filter((l) => l.label && l.url) ?? [];
  const hasExpandableContent = data.expandable && (!!data.details || eventLinks.length > 0);

  function handleTicketClick() {
    if (pageId) trackEvent(pageId, 'event_ticket_click', { blockId: block.id });
  }

  function handleCalendarClick() {
    if (pageId) trackEvent(pageId, 'event_calendar_add', { blockId: block.id });
  }

  function handleLinkClick() {
    if (pageId) trackEvent(pageId, 'event_link_click', { blockId: block.id });
  }

  function toggleExpand() {
    if (!hasExpandableContent) return;
    if (!expanded) {
      if (detailsRef.current) setDetailsHeight(detailsRef.current.scrollHeight);
      if (pageId) trackEvent(pageId, 'event_expand', { blockId: block.id });
    }
    setExpanded(!expanded);
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl overflow-hidden"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
        border: '1px solid rgba(128,128,128,0.1)',
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease',
        opacity: isPast ? 0.5 : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Cover image — fixed 16:9 aspect ratio so crop is identical on mobile + desktop */}
      {hasImage && (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '16 / 9' }}
        >
          <img
            src={`/api/public/file/${data.image_r2_key}`}
            alt={data.event_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Main row: date badge + info */}
      <div className="flex">
        <DateBadge dateStr={data.event_date} />

        <div className="flex-1 px-4 py-3 flex flex-col justify-center min-w-0">
          <h3
            className="text-sm font-bold truncate"
            style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
          >
            {data.event_name}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
            {time} &middot; {data.venue || 'Online'}
          </p>
          {isPast && (
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded"
              style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.15))', color: 'var(--page-text)', opacity: 0.6 }}
            >
              Past event
            </span>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {!isPast && data.ticket_url && (
              <a
                href={data.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTicketClick}
                className="text-xs font-bold transition-opacity duration-200 hover:opacity-75"
                style={{ color: 'var(--page-accent)' }}
              >
                Get Tickets &rarr;
              </a>
            )}
            {!isPast && (
              <a
                href={generateIcsUrl(data)}
                download={`${data.event_name.replace(/\s+/g, '-')}.ics`}
                onClick={handleCalendarClick}
                className="inline-flex items-center gap-1 text-[10px] font-medium transition-opacity duration-200 hover:opacity-75"
                style={{ color: 'var(--page-text)', opacity: 0.5 }}
              >
                <Calendar className="w-3 h-3" />
                Add to calendar
              </a>
            )}
            {hasExpandableContent && (
              <button
                onClick={toggleExpand}
                className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium transition-opacity duration-200 hover:opacity-75"
                style={{ color: 'var(--page-text)', opacity: 0.5 }}
              >
                Details
                <ChevronDown
                  className="w-3 h-3"
                  style={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable details + links */}
      {hasExpandableContent && (
        <div
          style={{
            maxHeight: expanded ? detailsHeight || 800 : 0,
            opacity: expanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease',
          }}
        >
          <div
            ref={detailsRef}
            className="px-4 pb-4 pt-3 space-y-3"
            style={{ borderTop: '1px solid rgba(128,128,128,0.1)' }}
          >
            {/* Details text */}
            {data.details && (
              <p
                className="text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--page-text)', opacity: 0.7 }}
              >
                {data.details}
              </p>
            )}

            {/* Links */}
            {eventLinks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {eventLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="group inline-flex items-center gap-1.5 text-xs font-medium py-1"
                    style={{ color: 'var(--page-accent)' }}
                  >
                    <ExternalLink
                      className="w-3 h-3 shrink-0"
                      style={{
                        opacity: 0.6,
                        transition: 'opacity 150ms ease, transform 150ms ease',
                      }}
                    />
                    <span
                      style={{
                        transition: 'opacity 150ms ease',
                      }}
                      className="group-hover:opacity-75"
                    >
                      {link.label}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
