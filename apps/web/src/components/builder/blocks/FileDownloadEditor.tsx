import { useState } from 'react';
import { Upload, File } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { FileDownloadData } from '@bytlinks/shared';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileDownloadEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as FileDownloadData;
  const [buttonLabel, setButtonLabel] = useState(data.button_label || 'Download');
  const [uploading, setUploading] = useState(false);

  function save(updates: Partial<FileDownloadData>) {
    editBlock(block.id, { data: { ...data, button_label: buttonLabel, ...updates } });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      save({ r2_key: result.r2_key, filename: result.filename, file_size: result.file_size });
    } catch {
      // handled
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {data.r2_key ? (
        <div className="flex items-center gap-3 rounded-lg border border-brand-border p-3">
          <File className="w-5 h-5 text-brand-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm text-brand-text truncate">{data.filename}</p>
            <p className="font-body text-xs text-brand-text-muted">{formatBytes(data.file_size)}</p>
          </div>
          <label className="px-2.5 py-1 rounded-md bg-brand-surface-alt font-body text-xs font-medium text-brand-text cursor-pointer hover:bg-brand-border transition-colors duration-150">
            Replace
            <input type="file" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-border p-6 cursor-pointer hover:border-brand-accent transition-colors duration-150">
          <Upload className="w-5 h-5 text-brand-text-muted mb-2" />
          <span className="font-body text-xs text-brand-text-muted">
            {uploading ? 'Uploading...' : 'Click to upload a file (max 10MB)'}
          </span>
          <input type="file" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      )}
      <input
        type="text"
        value={buttonLabel}
        onChange={(e) => setButtonLabel(e.target.value)}
        onBlur={() => save({ button_label: buttonLabel })}
        placeholder="Button label"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
    </div>
  );
}
