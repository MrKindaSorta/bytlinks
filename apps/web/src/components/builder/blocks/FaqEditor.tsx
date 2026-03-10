import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { FaqData, FaqItem } from '@bytlinks/shared';

export function FaqEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as FaqData;
  const [items, setItems] = useState<FaqItem[]>(data.items || []);
  const [showSearch, setShowSearch] = useState(data.show_search ?? false);
  const [searchPlaceholder, setSearchPlaceholder] = useState(data.search_placeholder || '');

  function saveData(updates: Partial<FaqData>) {
    editBlock(block.id, { data: { items, show_search: showSearch, search_placeholder: searchPlaceholder, ...updates } });
  }

  function save(newItems: FaqItem[]) {
    setItems(newItems);
    editBlock(block.id, { data: { items: newItems, show_search: showSearch, search_placeholder: searchPlaceholder } });
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

  function handleToggleSearch(checked: boolean) {
    setShowSearch(checked);
    saveData({ show_search: checked });
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

      {/* Divider */}
      <div className="border-t border-brand-border pt-3 space-y-3">
        {/* Show search toggle */}
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <span className="font-body text-sm text-brand-text">Show search bar</span>
            <p className="font-body text-[11px] text-brand-text-muted">Appears when you have more than 5 questions</p>
          </div>
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={showSearch}
              onChange={(e) => handleToggleSearch(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-brand-border peer-checked:bg-brand-accent transition-colors duration-150" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 peer-checked:translate-x-4" />
          </div>
        </label>

        {showSearch && (
          <div className="space-y-1">
            <label className="font-body text-xs text-brand-text-muted">Search placeholder text</label>
            <input
              type="text"
              value={searchPlaceholder}
              onChange={(e) => setSearchPlaceholder(e.target.value)}
              onBlur={() => saveData({ search_placeholder: searchPlaceholder })}
              placeholder="Search questions…"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
        )}
      </div>
    </div>
  );
}
