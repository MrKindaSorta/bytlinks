import { useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { ImageGalleryData, GalleryImage } from '@bytlinks/shared';
import { ImageCropEditor, CROP_FLEXIBLE } from '../../shared/ImageCropEditor';

const LAYOUTS = [
  { key: 'single', label: 'Single' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'grid', label: 'Grid' },
] as const;

export function ImageGalleryEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as ImageGalleryData;
  const [layout, setLayout] = useState<ImageGalleryData['layout']>(data.layout || 'single');
  const [images, setImages] = useState<GalleryImage[]>(data.images || []);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function save(updates: Partial<ImageGalleryData>) {
    const newData = { layout, images, ...updates };
    setImages(newData.images);
    setLayout(newData.layout);
    editBlock(block.id, { data: newData });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setCropFile(file);
    e.target.value = '';
  }

  async function handleCropConfirm(croppedFile: File) {
    setCropFile(null);
    setUploading(true);
    try {
      const result = await uploadFile(croppedFile);
      save({ images: [...images, { r2_key: result.r2_key }] });
    } catch {
      // handled
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    save({ images: images.filter((_, i) => i !== index) });
  }

  function updateCaption(index: number, caption: string) {
    const newImages = images.map((img, i) => i === index ? { ...img, caption } : img);
    setImages(newImages);
  }

  function saveCaptions() {
    save({ images });
  }

  function moveImage(fromIndex: number, direction: 'up' | 'down') {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;
    const newImages = [...images];
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    save({ images: newImages });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {LAYOUTS.map((l) => (
          <button
            key={l.key}
            onClick={() => save({ layout: l.key })}
            className={`px-2.5 py-1 rounded-md font-body text-xs font-medium transition-colors duration-150
              ${layout === l.key
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {images.map((img, i) => (
          <div key={img.r2_key} className="flex gap-2 items-start">
            {images.length > 1 && (
              <div className="flex flex-col gap-0.5 mt-3">
                <button
                  onClick={() => moveImage(i, 'up')}
                  disabled={i === 0}
                  className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                >
                  &uarr;
                </button>
                <button
                  onClick={() => moveImage(i, 'down')}
                  disabled={i === images.length - 1}
                  className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
                >
                  &darr;
                </button>
              </div>
            )}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-surface-alt shrink-0">
              <img src={`/api/public/file/${img.r2_key}`} alt={img.alt || ''} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors duration-150"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
            <input
              type="text"
              value={img.caption || ''}
              onChange={(e) => updateCaption(i, e.target.value)}
              onBlur={saveCaptions}
              placeholder="Caption (optional)"
              className="flex-1 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
        ))}
      </div>
      <label className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-border py-3 cursor-pointer hover:border-brand-accent transition-colors duration-150">
        <Upload className="w-4 h-4 text-brand-text-muted" />
        <span className="font-body text-xs text-brand-text-muted">
          {uploading ? 'Uploading...' : 'Add image'}
        </span>
        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
      </label>
      {cropFile && (
        <ImageCropEditor
          file={cropFile}
          presets={CROP_FLEXIBLE}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
