import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { QuoteData, QuoteStyle } from '@bytlinks/shared';

const STYLES: { key: QuoteStyle; label: string }[] = [
  { key: 'callout', label: 'Callout' },
  { key: 'centered', label: 'Centered' },
  { key: 'highlight', label: 'Highlight' },
  { key: 'minimal', label: 'Minimal' },
];

export function QuoteEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as QuoteData;
  const [text, setText] = useState(data.text || '');
  const [attribution, setAttribution] = useState(data.attribution || '');
  const [style, setStyle] = useState<QuoteStyle>(data.style || 'callout');

  function save(updates: Partial<QuoteData>) {
    const newData = { ...data, text, attribution, style, ...updates };
    editBlock(block.id, { data: newData });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => save({ text })}
        placeholder="Enter your quote or text..."
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
      />
      <input
        type="text"
        value={attribution}
        onChange={(e) => setAttribution(e.target.value)}
        onBlur={() => save({ attribution })}
        placeholder="Attribution (optional)"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <div className="flex gap-1.5">
        {STYLES.map((s) => (
          <button
            key={s.key}
            onClick={() => { setStyle(s.key); save({ style: s.key }); }}
            className={`px-2.5 py-1 rounded-md font-body text-xs font-medium transition-colors duration-150
              ${style === s.key
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
