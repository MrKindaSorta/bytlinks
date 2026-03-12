import { ExternalLink, ArrowUpRight } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { RichLinkData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkImage({ data }: { data: RichLinkData }) {
  const src = data.image_r2_key
    ? `/api/public/file/${data.image_r2_key}`
    : data.image_url || null;
  if (!src) return null;
  return <img src={src} alt="" className="w-full h-40 object-cover" loading="lazy" />;
}

export function RichLinkRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as RichLinkData;
  if (!data.url) return null;

  const hostname = getDomain(data.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  const showFavicon = data.show_favicon !== false;
  const mode = data.display_mode || 'card';

  function handleClick() {
    if (pageId) trackEvent(pageId, 'rich_link_click', { blockId: block.id });
  }

  // Compact: single-line
  if (mode === 'compact') {
    return (
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="scroll-reveal my-6 flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 hover:translate-y-[-1px]"
        style={{
          background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
        }}
      >
        {showFavicon && <img src={faviconUrl} alt="" className="w-4 h-4 rounded-sm shrink-0" />}
        <span className="text-sm font-semibold truncate flex-1" style={{ color: 'var(--page-text)' }}>
          {block.title || hostname}
        </span>
        <span className="text-[11px] shrink-0" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
          {hostname}
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--page-text)', opacity: 0.35 }} />
      </a>
    );
  }

  // Featured: large image hero
  if (mode === 'featured') {
    const imageSrc = data.image_r2_key
      ? `/api/public/file/${data.image_r2_key}`
      : data.image_url || null;

    return (
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="scroll-reveal my-6 block rounded-xl overflow-hidden group"
        style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
      >
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            style={{ height: '200px' }}
            loading="lazy"
          />
        )}
        <div className="px-5 py-4 space-y-2">
          {block.title && (
            <h3 className="text-base font-bold" style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}>
              {block.title}
            </h3>
          )}
          {data.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--page-text)', opacity: 0.65 }}>
              {data.description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            {showFavicon && <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />}
            <span className="text-[11px]" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
              {hostname}
            </span>
          </div>
          <div
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-opacity duration-200 group-hover:opacity-90"
            style={{ background: 'var(--page-accent, #0d9488)', color: '#fff' }}
          >
            Visit <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
      </a>
    );
  }

  // Card (default): existing behavior
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
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
      <LinkImage data={data} />
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
        {showFavicon && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />
            <p className="text-[11px]" style={{ color: 'var(--page-accent)', opacity: 0.7 }}>
              {hostname}
            </p>
          </div>
        )}
      </div>
    </a>
  );
}
