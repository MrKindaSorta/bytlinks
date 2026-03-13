import { useState, useCallback, useMemo } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { CalendarData, CalendarMode, CalendarProvider } from '@bytlinks/shared';

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

function autoMode(provider: CalendarProvider): CalendarMode {
  return provider === 'google' ? 'view' : 'book';
}

export function CalendarEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = normalizeCalendarData(block.data as Record<string, unknown>);
  const [url, setUrl] = useState(data.url);
  const [mode, setMode] = useState<CalendarMode>(data.mode || 'book');

  const provider = useMemo(() => url ? detectProvider(url) : undefined, [url]);

  const save = useCallback((updates: Partial<CalendarData>) => {
    const currentProvider = url ? detectProvider(url) : undefined;
    editBlock(block.id, {
      data: { url, mode, provider: currentProvider, ...updates },
    });
  }, [url, mode, editBlock, block.id]);

  const handleUrlBlur = useCallback(() => {
    const detected = url ? detectProvider(url) : undefined;
    const detectedMode = detected ? autoMode(detected) : mode;
    setMode(detectedMode);
    save({ url, mode: detectedMode, provider: detected });
  }, [url, mode, save]);

  const handleModeChange = useCallback((newMode: CalendarMode) => {
    setMode(newMode);
    save({ mode: newMode });
  }, [save]);

  const providerLabel = provider === 'calendly' ? 'Calendly'
    : provider === 'cal' ? 'Cal.com'
    : provider === 'google' ? 'Google Calendar'
    : provider === 'other' ? 'Other' : null;

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={handleUrlBlur}
        placeholder="https://calendly.com/you or https://cal.com/you"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      {providerLabel && url.trim() && (
        <p className="font-body text-[11px] text-brand-accent">
          Detected: {providerLabel}
        </p>
      )}
      {/* Mode toggle */}
      <div className="flex gap-1.5">
        {(['book', 'view'] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-colors duration-150
              ${mode === m
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {m === 'book' ? 'Booking' : 'View Only'}
          </button>
        ))}
      </div>
      <p className="font-body text-xs text-brand-text-muted">
        Paste a Calendly, Cal.com, or Google Calendar link. Booking mode embeds an interactive widget; View mode shows a read-only calendar.
      </p>
    </div>
  );
}
