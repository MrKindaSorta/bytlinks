import { useState } from 'react';
import { Plus, Trash2, Upload, GripVertical, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { TestimonialsData, TestimonialItem } from '@bytlinks/shared';
import { ImageCropEditor, CROP_SQUARE } from '../../shared/ImageCropEditor';

export function TestimonialsEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as TestimonialsData;
  const [items, setItems] = useState<TestimonialItem[]>(data.items || []);
  const [showSourceBadge, setShowSourceBadge] = useState(data.show_source_badge !== false);
  const [showRatingStars, setShowRatingStars] = useState(data.show_rating_stars !== false);
  const [cropState, setCropState] = useState<{ file: File; index: number } | null>(null);

  // Import section state
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState<'google' | 'trustpilot'>('google');
  const [importUrl, setImportUrl] = useState(data.import_url || '');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function save(updates: Partial<TestimonialsData>) {
    const next = {
      items,
      show_source_badge: showSourceBadge,
      show_rating_stars: showRatingStars,
      autoplay: data.autoplay !== false,
      autoplay_interval: data.autoplay_interval,
      ...updates,
    };
    if ('items' in updates) setItems(updates.items!);
    editBlock(block.id, { data: next });
  }

  function saveItems(newItems: TestimonialItem[]) {
    setItems(newItems);
    editBlock(block.id, {
      data: {
        items: newItems,
        show_source_badge: showSourceBadge,
        show_rating_stars: showRatingStars,
        autoplay: data.autoplay !== false,
        autoplay_interval: data.autoplay_interval,
        import_source: data.import_source,
        import_url: data.import_url,
        last_imported_at: data.last_imported_at,
      },
    });
  }

  function addItem() {
    saveItems([...items, { id: crypto.randomUUID(), quote: '', author: '' }]);
  }

  function removeItem(index: number) {
    saveItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, updates: Partial<TestimonialItem>) {
    const newItems = items.map((item, i) => i === index ? { ...item, ...updates } : item);
    saveItems(newItems);
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
    saveItems(newItems);
  }

  function toggleSourceBadge(val: boolean) {
    setShowSourceBadge(val);
    save({ show_source_badge: val });
  }

  function toggleRatingStars(val: boolean) {
    setShowRatingStars(val);
    save({ show_rating_stars: val });
  }

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetch('/api/utils/testimonials/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ block_id: block.id, source: importSource, url: importUrl.trim() }),
      });
      const json = await res.json() as { success: boolean; data?: { imported: number; total: number }; error?: string };
      if (json.success && json.data) {
        setImportMessage({ type: 'success', text: `Imported ${json.data.imported} new review${json.data.imported !== 1 ? 's' : ''} (${json.data.total} total)` });
        // Refresh items from response would require re-fetching; for now reload data
        window.location.reload();
      } else {
        setImportMessage({ type: 'error', text: json.error || 'Import failed' });
      }
    } catch {
      setImportMessage({ type: 'error', text: 'Network error during import' });
    } finally {
      setImporting(false);
    }
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

      {/* Display toggles */}
      <div className="pt-2 border-t border-brand-border space-y-2">
        <label className="flex items-center justify-between font-body text-xs text-brand-text-secondary cursor-pointer">
          <span>Show rating stars</span>
          <input
            type="checkbox"
            checked={showRatingStars}
            onChange={(e) => toggleRatingStars(e.target.checked)}
            className="rounded border-brand-border accent-brand-accent"
          />
        </label>
        <label className="flex items-center justify-between font-body text-xs text-brand-text-secondary cursor-pointer">
          <span>Show source badge</span>
          <input
            type="checkbox"
            checked={showSourceBadge}
            onChange={(e) => toggleSourceBadge(e.target.checked)}
            className="rounded border-brand-border accent-brand-accent"
          />
        </label>
      </div>

      {/* Import Reviews section */}
      <div className="border border-brand-border rounded-lg overflow-hidden">
        <button
          onClick={() => setImportOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-brand-surface-alt hover:bg-brand-surface transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-brand-text-muted" />
            <span className="font-body text-xs font-medium text-brand-text-secondary">Import Reviews</span>
          </div>
          {importOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-brand-text-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-brand-text-muted" />
          )}
        </button>

        {importOpen && (
          <div className="p-3 space-y-3">
            {/* Source picker */}
            <div className="flex gap-2">
              {(['google', 'trustpilot'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setImportSource(src)}
                  className={`flex-1 py-1.5 rounded-md font-body text-xs font-medium border transition-colors duration-150 ${
                    importSource === src
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-brand-bg text-brand-text-secondary border-brand-border hover:border-brand-accent'
                  }`}
                >
                  {src === 'google' ? 'Google' : 'Trustpilot'}
                </button>
              ))}
            </div>

            {importSource === 'trustpilot' && (
              <p className="font-body text-[11px] text-brand-text-muted bg-brand-surface-alt rounded-md px-3 py-2">
                Trustpilot import is coming soon.
              </p>
            )}

            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder={
                importSource === 'google'
                  ? 'Google Business profile URL'
                  : 'Trustpilot company URL'
              }
              className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />

            <button
              onClick={handleImport}
              disabled={importing || !importUrl.trim() || importSource === 'trustpilot'}
              className="w-full py-1.5 rounded-md font-body text-xs font-medium bg-brand-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>

            {importMessage && (
              <p className={`font-body text-[11px] ${importMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {importMessage.text}
              </p>
            )}
          </div>
        )}
      </div>

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
