import type { BlockRendererProps } from './blockRendererRegistry';
import type { ProductCardData, ProductItem } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';
import { ShoppingBag } from 'lucide-react';

function ProductCard({
  item,
  buttonLabel,
  showPrice,
  pageId,
  blockId,
}: {
  item: ProductItem;
  buttonLabel: string;
  showPrice: boolean;
  pageId?: string;
  blockId: string;
}) {
  function handleBuyClick() {
    if (pageId) trackEvent(pageId, 'product_click', { blockId });
  }

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden">
        {item.image_r2_key ? (
          <img
            src={`/api/public/file/${item.image_r2_key}`}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.08))' }}
          >
            <ShoppingBag className="w-8 h-8" style={{ color: 'var(--page-text)', opacity: 0.2 }} />
          </div>
        )}
        {item.badge && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: 'var(--page-accent)',
              color: 'var(--page-bg, #fff)',
            }}
          >
            {item.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--page-text)' }}>
          {item.name}
        </p>
        {showPrice && item.price && (
          <p className="text-sm font-medium" style={{ color: 'var(--page-accent)' }}>
            {item.price}
          </p>
        )}
        {item.description && (
          <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
            {item.description}
          </p>
        )}
        <a
          href={item.buy_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleBuyClick}
          className="mt-auto block text-center text-xs font-semibold rounded-lg px-3 py-2 transition-opacity duration-150 hover:opacity-80"
          style={{
            background: 'var(--page-accent)',
            color: 'var(--page-bg, #fff)',
          }}
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  );
}

function ProductListCard({
  item,
  buttonLabel,
  showPrice,
  pageId,
  blockId,
}: {
  item: ProductItem;
  buttonLabel: string;
  showPrice: boolean;
  pageId?: string;
  blockId: string;
}) {
  function handleBuyClick() {
    if (pageId) trackEvent(pageId, 'product_click', { blockId });
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
        {item.image_r2_key ? (
          <img
            src={`/api/public/file/${item.image_r2_key}`}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }}
          >
            <ShoppingBag className="w-5 h-5" style={{ color: 'var(--page-text)', opacity: 0.25 }} />
          </div>
        )}
        {item.badge && (
          <span
            className="absolute top-1 left-1 px-1.5 py-px rounded-full text-[9px] font-semibold leading-tight"
            style={{ background: 'var(--page-accent)', color: 'var(--page-bg, #fff)' }}
          >
            {item.badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--page-text)' }}>
          {item.name}
        </p>
        {showPrice && item.price && (
          <p className="text-xs font-medium" style={{ color: 'var(--page-accent)' }}>
            {item.price}
          </p>
        )}
        {item.description && (
          <p className="text-[11px] leading-snug line-clamp-2 mt-0.5" style={{ color: 'var(--page-text)', opacity: 0.55 }}>
            {item.description}
          </p>
        )}
      </div>

      {/* CTA */}
      <a
        href={item.buy_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleBuyClick}
        className="shrink-0 text-xs font-semibold rounded-lg px-3 py-2 transition-opacity duration-150 hover:opacity-80"
        style={{ background: 'var(--page-accent)', color: 'var(--page-bg, #fff)' }}
      >
        {buttonLabel}
      </a>
    </div>
  );
}

export function ProductCardRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as ProductCardData;

  if (!data.items?.length) return null;

  const cols = data.columns ?? 2;
  const gridCols = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="scroll-reveal my-6">
      {block.title && (
        <h3
          className="text-base font-bold tracking-tight mb-3"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}

      {data.layout === 'list' ? (
        <div className="space-y-2">
          {data.items.map((item) => (
            <ProductListCard
              key={item.id}
              item={item}
              buttonLabel={data.button_label || 'Buy Now'}
              showPrice={data.show_price}
              pageId={pageId}
              blockId={block.id}
            />
          ))}
        </div>
      ) : (
        <div className={`grid ${gridCols} gap-3`}>
          {data.items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              buttonLabel={data.button_label || 'Buy Now'}
              showPrice={data.show_price}
              pageId={pageId}
              blockId={block.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
