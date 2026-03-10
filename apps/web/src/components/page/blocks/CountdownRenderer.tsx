import { useState, useEffect, useRef } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { CountdownData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function getTargetTimestamp(data: CountdownData): number | null {
  if (data.recurrence && data.recurrence !== 'none' && data.recurrence_time) {
    return getNextRecurrence(data);
  }
  if (!data.target_date) return null;
  // Parse target_date in configured timezone using Intl
  const tz = data.timezone || 'UTC';
  try {
    // target_date is "YYYY-MM-DDTHH:mm" from datetime-local input
    const dateStr = data.target_date.includes('T') ? data.target_date : `${data.target_date}T00:00`;
    // Create a date and adjust for timezone
    const naive = new Date(dateStr + 'Z'); // treat as UTC initially
    const utcMs = naive.getTime();
    // Get the offset of the target timezone at that time
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(naive);
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
    const offsetMs = parseOffset(offsetPart);
    return utcMs - offsetMs;
  } catch {
    return new Date(data.target_date).getTime();
  }
}

function parseOffset(offsetStr: string): number {
  // Parse "GMT+5:30" or "GMT-8" etc
  const match = offsetStr.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] || '0', 10);
  return sign * (hours * 3600000 + minutes * 60000);
}

function getNextRecurrence(data: CountdownData): number | null {
  const now = Date.now();
  const time = data.recurrence_time || '12:00';
  const [h, m] = time.split(':').map(Number);

  if (data.recurrence === 'weekly' && data.recurrence_day != null) {
    // recurrence_day: 0=Mon, 1=Tue, ... 6=Sun
    const jsDay = ((data.recurrence_day + 1) % 7); // convert to JS 0=Sun
    const d = new Date();
    d.setHours(h, m, 0, 0);
    const currentDay = d.getDay();
    let daysUntil = jsDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0 && d.getTime() <= now) daysUntil = 7;
    d.setDate(d.getDate() + daysUntil);
    return d.getTime();
  }

  if (data.recurrence === 'monthly' && data.recurrence_day != null) {
    const d = new Date();
    d.setDate(data.recurrence_day);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now) {
      d.setMonth(d.getMonth() + 1);
    }
    return d.getTime();
  }

  return null;
}

function getTimeLeft(targetMs: number) {
  const diff = targetMs - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label, prevValue }: { value: number; label: string; prevValue: number }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(t);
    }
  }, [value, prevValue]);

  return (
    <div className="flex flex-col items-center">
      <span
        className="text-2xl font-bold tabular-nums"
        style={{
          color: 'var(--page-text)',
          fontFamily: 'var(--page-font-display)',
          transform: animate ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--page-text)', opacity: 0.5 }}>
        {label}
      </span>
    </div>
  );
}

function formatVisitorTime(targetMs: number): string | null {
  try {
    const d = new Date(targetMs);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function CountdownRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as CountdownData;
  const trackedRef = useRef(false);
  const prevRef = useRef({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const targetMs = getTargetTimestamp(data);

  const [timeLeft, setTimeLeft] = useState(() => targetMs ? getTimeLeft(targetMs) : null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!targetMs) return;
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  // Track countdown view once
  useEffect(() => {
    if (timeLeft && !trackedRef.current && pageId) {
      trackedRef.current = true;
      trackEvent(pageId, 'countdown_view', { blockId: block.id });
    }
  }, [timeLeft, pageId, block.id]);

  // Animate reveal transition
  useEffect(() => {
    if (!timeLeft && data.reveal_enabled) {
      const t = setTimeout(() => setRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [timeLeft, data.reveal_enabled]);

  if (!data.target_date && (!data.recurrence || data.recurrence === 'none')) return null;

  // Check if block should be hidden after expiry
  if (!timeLeft && data.reveal_hide_after_hours && targetMs) {
    const hideAt = targetMs + data.reveal_hide_after_hours * 3600000;
    if (Date.now() > hideAt) return null;
  }

  const prev = prevRef.current;
  if (timeLeft) {
    prevRef.current = { ...timeLeft };
  }

  const visitorTime = targetMs && data.show_visitor_timezone !== false ? formatVisitorTime(targetMs) : null;

  // Reveal panel for expired countdowns
  if (!timeLeft && data.reveal_enabled) {
    return (
      <div
        className="scroll-reveal my-6 rounded-xl overflow-hidden"
        style={{
          background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        {data.reveal_image_r2_key && (
          <img
            src={`/api/public/file/${data.reveal_image_r2_key}`}
            alt=""
            className="w-full object-cover rounded-t-xl"
            style={{ maxHeight: '240px' }}
            loading="lazy"
          />
        )}
        <div className="px-5 py-5 text-center space-y-3">
          {data.reveal_headline && (
            <h3
              className="text-xl font-bold"
              style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
            >
              {data.reveal_headline}
            </h3>
          )}
          {data.reveal_description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--page-text)', opacity: 0.7 }}>
              {data.reveal_description}
            </p>
          )}
          {data.reveal_cta_label && data.reveal_cta_url && (
            <a
              href={data.reveal_cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity duration-200 hover:opacity-90"
              style={{
                background: 'var(--page-accent, #0d9488)',
                color: '#fff',
              }}
            >
              {data.reveal_cta_label}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-5 text-center"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      {data.label && (
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--page-text)', opacity: 0.7 }}>
          {data.label}
        </p>
      )}
      {timeLeft ? (
        <>
          <div className="flex items-center justify-center gap-4">
            <TimeUnit value={timeLeft.days} label="Days" prevValue={prev.days} />
            <span className="text-lg font-bold opacity-30" style={{ color: 'var(--page-text)' }}>:</span>
            <TimeUnit value={timeLeft.hours} label="Hours" prevValue={prev.hours} />
            <span className="text-lg font-bold opacity-30" style={{ color: 'var(--page-text)' }}>:</span>
            <TimeUnit value={timeLeft.minutes} label="Min" prevValue={prev.minutes} />
            <span className="text-lg font-bold opacity-30" style={{ color: 'var(--page-text)' }}>:</span>
            <TimeUnit value={timeLeft.seconds} label="Sec" prevValue={prev.seconds} />
          </div>
          {visitorTime && (
            <p className="text-[11px] mt-3" style={{ color: 'var(--page-text)', opacity: 0.45 }}>
              That's {visitorTime} in your timezone
            </p>
          )}
        </>
      ) : (
        <div className="py-2">
          <p className="text-sm font-medium" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
            {data.expired_text || 'This event has passed'}
          </p>
          {data.label && targetMs && (
            <p className="text-xs mt-1" style={{ color: 'var(--page-text)', opacity: 0.3 }}>
              {new Date(targetMs).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
