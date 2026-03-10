import { useState, useEffect } from 'react';
import { FileText, FileCode, Image, Music, Video, Download } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { FileDownloadData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return FileText;
  if (['zip', 'rar', 'tar', 'gz', 'js', 'ts', 'py', 'html', 'css', 'json', 'xml', 'csv'].includes(ext)) return FileCode;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return Image;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return Music;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) return Video;
  return Download;
}

export function FileDownloadRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as FileDownloadData;
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  useEffect(() => {
    if (!data.show_download_count) return;
    fetch(`/api/public/block/${block.id}/download-count`)
      .then((r) => r.json() as Promise<{ count: number | null }>)
      .then((res) => {
        if (typeof res.count === 'number') {
          setDownloadCount(res.count);
        }
      })
      .catch(() => {});
  }, [block.id, data.show_download_count]);

  if (!data.r2_key) return null;

  const Icon = getFileIcon(data.filename || '');

  return (
    <div className="scroll-reveal my-6">
      <a
        href={`/api/public/file/${data.r2_key}`}
        download={data.filename}
        onClick={() => pageId && trackEvent(pageId, 'file_download', { blockId: block.id })}
        className="flex items-center gap-3 rounded-xl px-4 py-3 group"
        style={{
          background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.01) translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--page-accent)', opacity: 0.15 }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: 'var(--page-accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--page-text)' }}>
            {data.button_label || data.filename || 'Download'}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--page-text)', opacity: 0.5 }}>
            {data.filename} &middot; {formatBytes(data.file_size)}
          </p>
        </div>
        <Download
          className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5"
          style={{ color: 'var(--page-text)', opacity: 0.4 }}
        />
      </a>
      {downloadCount !== null && (
        <p
          className="text-[11px] mt-1.5 text-center"
          style={{ color: 'var(--page-text)', opacity: 0.5 }}
        >
          ↓ {downloadCount.toLocaleString()} downloads
        </p>
      )}
    </div>
  );
}
