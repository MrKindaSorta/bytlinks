import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { CountdownData } from '@bytlinks/shared';

export function CountdownEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as CountdownData;
  const [targetDate, setTargetDate] = useState(data.target_date || '');
  const [label, setLabel] = useState(data.label || '');
  const [expiredText, setExpiredText] = useState(data.expired_text || '');

  function save(updates: Partial<CountdownData>) {
    editBlock(block.id, { data: { ...data, target_date: targetDate, label, expired_text: expiredText, ...updates } });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="font-body text-xs font-medium text-brand-text-secondary mb-1 block">Target Date & Time</label>
        <input
          type="datetime-local"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          onBlur={() => save({ target_date: targetDate })}
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent"
        />
      </div>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => save({ label })}
        placeholder="Label (e.g. 'Launch day!')"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="text"
        value={expiredText}
        onChange={(e) => setExpiredText(e.target.value)}
        onBlur={() => save({ expired_text: expiredText })}
        placeholder="Text when expired (e.g. 'It's here!')"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
    </div>
  );
}
