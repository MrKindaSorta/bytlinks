import { ExternalLink } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { RichLinkData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

export function RichLinkRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as RichLinkData;
  if (!data.url) return null;

  let hostname = '';
  try {
    hostname = new URL(data.url).hostname;
  } catch {
    hostname = data.url;
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => pageId && trackEvent(pageId, 'rich_link_click', { blockId: block.id })}
      className="scroll-reveal my-6 block rounded-xl overflow-hidden group"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.01) translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {data.image_r2_key && (
        <img
          src={`/api/public/file/${data.image_r2_key}`}
          alt=""
          className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}
      <div className="px-4 py-3">
        {block.title && (
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--page-text)' }}>
            {block.title}
            <ExternalLink className="w-3 h-3 opacity-40 transition-opacity duration-150 group-hover:opacity-70" />
          </h3>
        )}
        {data.description && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--page-text)', opacity: 0.65 }}>
            {data.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />
          <p className="text-[11px]" style={{ color: 'var(--page-accent)', opacity: 0.7 }}>
            {hostname}
          </p>
        </div>
      </div>
    </a>
  );
}
