import { useState } from 'react';
import { Plus, Trash2, GripVertical, Upload } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { ProductCardData, ProductItem } from '@bytlinks/shared';

const MAX_ITEMS = 6;

export function ProductCardEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as ProductCardData;
  const [items, setItems] = useState<ProductItem[]>(data.items || []);
  const [layout, setLayout] = useState<'grid' | 'list'>(data.layout || 'grid');
  const [columns, setColumns] = useState<1 | 2 | 3>(data.columns || 2);
  const [buttonLabel, setButtonLabel] = useState(data.button_label || 'Buy Now');
  const [showPrice, setShowPrice] = useState(data.show_price ?? true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function saveAll(updates?: Partial<ProductCardData>) {
    editBlock(block.id, {
      data: {
        items,
        layout,
        columns,
        button_label: buttonLabel,
        show_price: showPrice,
        ...updates,
      },
    });
  }

  function updateItem(id: string, updates: Partial<ProductItem>) {
    const newItems = items.map((item) => item.id === id ? { ...item, ...updates } : item);
    setItems(newItems);
    saveAll({ items: newItems });
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    const newItem: ProductItem = {
      id: crypto.randomUUID(),
      name: '',
      buy_url: '',
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    saveAll({ items: newItems });
  }

  function removeItem(id: string) {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    saveAll({ items: newItems });
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const toIndex = direction === 'up' ? index - 1 : index + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[toIndex]] = [newItems[toIndex], newItems[index]];
    setItems(newItems);
    saveAll({ items: newItems });
  }

  async function handleImageUpload(itemId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(itemId);
    try {
      const result = await uploadFile(file);
      updateItem(itemId, { image_r2_key: result.r2_key });
    } catch {
      // handled
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Items */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-lg border border-brand-border p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                {items.length > 1 && (
                  <>
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
                  </>
                )}
                <span className="font-body text-xs text-brand-text-muted">Item {i + 1}</span>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 text-brand-text-muted hover:text-red-500 transition-colors duration-150"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Image upload */}
            <div className="flex items-center gap-2">
              {item.image_r2_key ? (
                <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border border-brand-border">
                  <img
                    src={`/api/public/file/${item.image_r2_key}`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-md border-2 border-dashed border-brand-border flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4 text-brand-text-muted" />
                </div>
              )}
              <label className="px-2.5 py-1 rounded-md bg-brand-surface-alt font-body text-xs font-medium text-brand-text cursor-pointer hover:bg-brand-border transition-colors duration-150">
                {uploadingId === item.id ? 'Uploading…' : item.image_r2_key ? 'Change image' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(item.id, e)}
                  className="hidden"
                  disabled={uploadingId === item.id}
                />
              </label>
            </div>

            {/* Name */}
            <input
              type="text"
              value={item.name}
              onChange={(e) => {
                const newItems = items.map((it) => it.id === item.id ? { ...it, name: e.target.value } : it);
                setItems(newItems);
              }}
              onBlur={() => updateItem(item.id, { name: item.name })}
              placeholder="Product name"
              className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />

            {/* Price */}
            <input
              type="text"
              value={item.price || ''}
              onChange={(e) => {
                const newItems = items.map((it) => it.id === item.id ? { ...it, price: e.target.value } : it);
                setItems(newItems);
              }}
              onBlur={() => updateItem(item.id, { price: item.price })}
              placeholder="Price (e.g. $29.99)"
              className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />

            {/* Description */}
            <textarea
              value={item.description || ''}
              onChange={(e) => {
                const val = e.target.value.slice(0, 150);
                const newItems = items.map((it) => it.id === item.id ? { ...it, description: val } : it);
                setItems(newItems);
              }}
              onBlur={() => updateItem(item.id, { description: item.description })}
              placeholder="Description (max 150 chars)"
              maxLength={150}
              rows={2}
              className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
            />

            {/* Buy URL */}
            <input
              type="url"
              value={item.buy_url}
              onChange={(e) => {
                const newItems = items.map((it) => it.id === item.id ? { ...it, buy_url: e.target.value } : it);
                setItems(newItems);
              }}
              onBlur={() => updateItem(item.id, { buy_url: item.buy_url })}
              placeholder="Buy URL (https://…)"
              className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />

            {/* Badge */}
            <input
              type="text"
              value={item.badge || ''}
              onChange={(e) => {
                const newItems = items.map((it) => it.id === item.id ? { ...it, badge: e.target.value } : it);
                setItems(newItems);
              }}
              onBlur={() => updateItem(item.id, { badge: item.badge })}
              placeholder="Badge label (e.g. New, Sale)"
              className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
        ))}

        {items.length < MAX_ITEMS && (
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 font-body text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            Add product ({items.length}/{MAX_ITEMS})
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-brand-border pt-3 space-y-3">
        {/* Layout */}
        <div className="space-y-1.5">
          <label className="font-body text-xs text-brand-text-muted">Layout</label>
          <div className="flex gap-2">
            {(['grid', 'list'] as const).map((l) => (
              <button
                key={l}
                onClick={() => { setLayout(l); saveAll({ layout: l }); }}
                className={`flex-1 px-3 py-1.5 rounded-md font-body text-xs font-medium border transition-colors duration-150 ${
                  layout === l
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'text-brand-text border-brand-border hover:bg-brand-surface-alt'
                }`}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Columns (grid only) */}
        {layout === 'grid' && (
          <div className="space-y-1.5">
            <label className="font-body text-xs text-brand-text-muted">Columns</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setColumns(c); saveAll({ columns: c }); }}
                  className={`flex-1 px-3 py-1.5 rounded-md font-body text-xs font-medium border transition-colors duration-150 ${
                    columns === c
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'text-brand-text border-brand-border hover:bg-brand-surface-alt'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Button label */}
        <div className="space-y-1">
          <label className="font-body text-xs text-brand-text-muted">Button label</label>
          <input
            type="text"
            value={buttonLabel}
            onChange={(e) => setButtonLabel(e.target.value)}
            onBlur={() => saveAll({ button_label: buttonLabel })}
            placeholder="Buy Now"
            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
          />
        </div>

        {/* Show price toggle */}
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="font-body text-sm text-brand-text">Show price</span>
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => { setShowPrice(e.target.checked); saveAll({ show_price: e.target.checked }); }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-brand-border peer-checked:bg-brand-accent transition-colors duration-150" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 peer-checked:translate-x-4" />
          </div>
        </label>
      </div>
    </div>
  );
}
