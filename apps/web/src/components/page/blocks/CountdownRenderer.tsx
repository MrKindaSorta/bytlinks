import { useState, useEffect, useRef } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { CountdownData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function getTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
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

export function CountdownRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as CountdownData;
  const trackedRef = useRef(false);
  const prevRef = useRef({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const timeLeft = useCountdown(data.target_date || '');

  // Track countdown view once
  useEffect(() => {
    if (timeLeft && !trackedRef.current && pageId) {
      trackedRef.current = true;
      trackEvent(pageId, 'countdown_view', { blockId: block.id });
    }
  }, [timeLeft, pageId, block.id]);

  if (!data.target_date) return null;

  const prev = prevRef.current;
  if (timeLeft) {
    prevRef.current = { ...timeLeft };
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
        <div className="flex items-center justify-center gap-4">
          <TimeUnit value={timeLeft.days} label="Days" prevValue={prev.days} />
          <span className="text-lg font-bold opacity-30" style={{ color: 'var(--page-text)' }}>:</span>
          <TimeUnit value={timeLeft.hours} label="Hours" prevValue={prev.hours} />
          <span className="text-lg font-bold opacity-30" style={{ color: 'var(--page-text)' }}>:</span>
          <TimeUnit value={timeLeft.minutes} label="Min" prevValue={prev.minutes} />
          <span className="text-lg font-bold opacity-30" style={{ color: 'var(--page-text)' }}>:</span>
          <TimeUnit value={timeLeft.seconds} label="Sec" prevValue={prev.seconds} />
        </div>
      ) : (
        <div className="py-2">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--page-text)', opacity: 0.6 }}
          >
            {data.expired_text || 'This event has passed'}
          </p>
          {data.label && (
            <p className="text-xs mt-1" style={{ color: 'var(--page-text)', opacity: 0.3 }}>
              {new Date(data.target_date).toLocaleDateString(undefined, {
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
