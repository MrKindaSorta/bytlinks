import { useState } from 'react';
import { Upload, Trash2, Image } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { RichLinkData } from '@bytlinks/shared';
import { ImageCropEditor, CROP_FLEXIBLE } from '../../shared/ImageCropEditor';

export function RichLinkEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as RichLinkData;
  const [url, setUrl] = useState(data.url || '');
  const [description, setDescription] = useState(data.description || '');
  const [imageKey, setImageKey] = useState(data.image_r2_key || '');
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function save(updates: Partial<RichLinkData>) {
    editBlock(block.id, { data: { ...data, url, description, image_r2_key: imageKey, ...updates } });
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
      setImageKey(result.r2_key);
      save({ image_r2_key: result.r2_key });
    } catch {
      // handled
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImageKey('');
    save({ image_r2_key: '' });
  }

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => save({ url })}
        placeholder="https://example.com"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => save({ description })}
        placeholder="Description or rich text content..."
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
      />
      {/* Image upload */}
      {imageKey ? (
        <div className="relative rounded-lg overflow-hidden bg-brand-surface-alt">
          <img src={`/api/public/file/${imageKey}`} alt="" className="w-full h-28 object-cover" />
          <button
            onClick={removeImage}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors duration-150"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-brand-border px-3 py-2.5 cursor-pointer hover:border-brand-accent transition-colors duration-150">
          {uploading ? (
            <Upload className="w-4 h-4 text-brand-text-muted animate-pulse" />
          ) : (
            <Image className="w-4 h-4 text-brand-text-muted" />
          )}
          <span className="font-body text-xs text-brand-text-muted">
            {uploading ? 'Uploading...' : 'Add preview image (optional)'}
          </span>
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
        </label>
      )}
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
