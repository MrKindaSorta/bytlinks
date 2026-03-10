import { useState } from 'react';
import { Plus, Trash2, Upload, GripVertical } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { TestimonialsData, TestimonialItem } from '@bytlinks/shared';
import { ImageCropEditor, CROP_SQUARE } from '../../shared/ImageCropEditor';

export function TestimonialsEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as TestimonialsData;
  const [items, setItems] = useState<TestimonialItem[]>(data.items || []);
  const [cropState, setCropState] = useState<{ file: File; index: number } | null>(null);

  function save(newItems: TestimonialItem[]) {
    setItems(newItems);
    editBlock(block.id, { data: { items: newItems } });
  }

  function addItem() {
    save([...items, { id: crypto.randomUUID(), quote: '', author: '' }]);
  }

  function removeItem(index: number) {
    save(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, updates: Partial<TestimonialItem>) {
    const newItems = items.map((item, i) => i === index ? { ...item, ...updates } : item);
    save(newItems);
  }

  function handleAvatarSelect(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setCropState({ file, index });
    e.target.value = '';
  }

  async function handleCropConfirm(croppedFile: File) {
    if (!cropState) return;
    const { index } = cropState;
    setCropState(null);
    try {
      const result = await uploadFile(croppedFile);
      updateItem(index, { avatar_r2_key: result.r2_key });
    } catch {
      // handled
    }
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
            {/* Avatar upload */}
            <label className="shrink-0 cursor-pointer group">
              {item.avatar_r2_key ? (
                <img
                  src={`/api/public/file/${item.avatar_r2_key}`}
                  alt={item.author}
                  className="w-10 h-10 rounded-full object-cover transition-opacity duration-150 group-hover:opacity-70"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-surface-alt flex items-center justify-center transition-colors duration-150 group-hover:border-brand-accent border-2 border-dashed border-brand-border">
                  <Upload className="w-3.5 h-3.5 text-brand-text-muted" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => handleAvatarSelect(i, e)} className="hidden" />
            </label>
            <div className="flex-1 space-y-2">
              <textarea
                value={item.quote}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], quote: e.target.value };
                  setItems(newItems);
                }}
                onBlur={() => updateItem(i, { quote: items[i].quote })}
                placeholder="Testimonial quote..."
                rows={2}
                className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={item.author}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], author: e.target.value };
                    setItems(newItems);
                  }}
                  onBlur={() => updateItem(i, { author: items[i].author })}
                  placeholder="Author name"
                  className="flex-1 px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
                <input
                  type="text"
                  value={item.role || ''}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], role: e.target.value };
                    setItems(newItems);
                  }}
                  onBlur={() => updateItem(i, { role: items[i].role })}
                  placeholder="Role (optional)"
                  className="flex-1 px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {items.length > 1 && (
                <>
                  <button
                    onClick={() => moveItem(i, 'up')}
                    disabled={i === 0}
                    className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                  >
                    <GripVertical className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <button
                    onClick={() => moveItem(i, 'down')}
                    disabled={i === items.length - 1}
                    className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button onClick={() => removeItem(i)} className="p-0.5 text-brand-text-muted hover:text-red-500 transition-colors duration-150">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 font-body text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
      >
        <Plus className="w-3.5 h-3.5" />
        Add testimonial
      </button>
      {cropState && (
        <ImageCropEditor
          file={cropState.file}
          presets={CROP_SQUARE}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropState(null)}
        />
      )}
    </div>
  );
}
