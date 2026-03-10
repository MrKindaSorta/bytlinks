import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { StatsData, StatItem } from '@bytlinks/shared';

export function StatsEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as StatsData;
  const [items, setItems] = useState<StatItem[]>(data.items || []);
  const [animate, setAnimate] = useState(data.animate !== false);

  function save(updated: StatItem[], anim?: boolean) {
    editBlock(block.id, { data: { items: updated, animate: anim ?? animate } });
  }

  function updateItem(index: number, field: keyof StatItem, value: string) {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    setItems(next);
  }

  function addItem() {
    if (items.length >= 6) return;
    const next = [...items, { value: '', label: '' }];
    setItems(next);
    save(next);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    save(next);
  }

  function moveItem(fromIndex: number, direction: 'up' | 'down') {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const next = [...items];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    setItems(next);
    save(next);
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-[11px] text-brand-text-muted">
        Use prefixes/suffixes in the value field: $12K, 99%, 4.9/5
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex flex-col gap-0.5 mt-2">
            {items.length > 1 && (
              <>
                <button
                  onClick={() => moveItem(i, 'up')}
                  disabled={i === 0}
                  className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                >
                  &uarr;
                </button>
                <button
                  onClick={() => moveItem(i, 'down')}
                  disabled={i === items.length - 1}
                  className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                >
                  &darr;
                </button>
              </>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={item.value}
              onChange={(e) => updateItem(i, 'value', e.target.value)}
              onBlur={() => save(items)}
              placeholder="$12,000 or 99%"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem(i, 'label', e.target.value)}
              onBlur={() => save(items)}
              placeholder="subscribers"
              className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="mt-2 text-xs text-brand-text-muted hover:text-red-500 transition-colors duration-150"
          >
            &times;
          </button>
        </div>
      ))}
      {items.length < 6 && (
        <button
          type="button"
          onClick={addItem}
          className="w-full py-2 rounded-lg border border-dashed border-brand-border text-xs font-medium text-brand-text-muted hover:border-brand-accent hover:text-brand-accent transition-colors duration-150"
        >
          + Add stat
        </button>
      )}
      <label className="flex items-center gap-2 font-body text-xs text-brand-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={animate}
          onChange={(e) => {
            setAnimate(e.target.checked);
            save(items, e.target.checked);
          }}
          className="accent-brand-accent"
        />
        Animate numbers on scroll
      </label>
    </div>
  );
}
