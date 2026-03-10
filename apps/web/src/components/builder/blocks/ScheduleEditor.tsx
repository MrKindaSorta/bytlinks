import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { ScheduleData } from '@bytlinks/shared';

export function ScheduleEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as ScheduleData;
  const [calendarUrl, setCalendarUrl] = useState(data.calendar_url || '');

  function save(updates: Partial<ScheduleData>) {
    editBlock(block.id, { data: { ...data, calendar_url: calendarUrl, ...updates } });
  }

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={calendarUrl}
        onChange={(e) => setCalendarUrl(e.target.value)}
        onBlur={() => save({ calendar_url: calendarUrl })}
        placeholder="https://calendly.com/your-link or https://cal.com/your-link"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <p className="font-body text-xs text-brand-text-muted">
        Paste your Calendly or Cal.com scheduling link.
      </p>
    </div>
  );
}
