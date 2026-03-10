import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { FaqData, FaqItem } from '@bytlinks/shared';

export function FaqEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as FaqData;
  const [items, setItems] = useState<FaqItem[]>(data.items || []);

  function save(newItems: FaqItem[]) {
    setItems(newItems);
    editBlock(block.id, { data: { items: newItems } });
  }

  function updateItem(index: number, updates: Partial<FaqItem>) {
    const newItems = items.map((item, i) => i === index ? { ...item, ...updates } : item);
    save(newItems);
  }

  function addItem() {
    save([...items, { id: crypto.randomUUID(), question: '', answer: '' }]);
  }

  function removeItem(index: number) {
    save(items.filter((_, i) => i !== index));
  }

  function moveItem(fromIndex: number, direction: 'up' | 'down') {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    [newItems[fromIndex], newItems[toIndex]] = [newItems[toIndex], newItems[fromIndex]];
    save(newItems);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-brand-border p-3 space-y-2">
          <div className="flex items-start gap-2">
            {/* Reorder controls */}
            {items.length > 1 && (
              <div className="flex flex-col gap-0.5 mt-1.5">
                <button
                  onClick={() => moveItem(i, 'up')}
                  disabled={i === 0}
                  className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                >
                  <GripVertical className="w-3 h-3 -rotate-90" />
                </button>
                <button
                  onClick={() => moveItem(i, 'down')}
                  disabled={i === items.length - 1}
                  className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                >
                  <GripVertical className="w-3 h-3 rotate-90" />
                </button>
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={item.question}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], question: e.target.value };
                  setItems(newItems);
                }}
                onBlur={() => updateItem(i, { question: items[i].question })}
                placeholder="Question"
                className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
              <textarea
                value={item.answer}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], answer: e.target.value };
                  setItems(newItems);
                }}
                onBlur={() => updateItem(i, { answer: items[i].answer })}
                placeholder="Answer"
                rows={2}
                className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
              />
            </div>
            <button
              onClick={() => removeItem(i)}
              className="p-1 text-brand-text-muted hover:text-red-500 transition-colors duration-150 mt-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 font-body text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
      >
        <Plus className="w-3.5 h-3.5" />
        Add question
      </button>
    </div>
  );
}
