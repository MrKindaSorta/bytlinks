import type { BlockRendererProps } from './blockRendererRegistry';
import type { TipJarData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

const PROVIDER_LABELS: Record<string, string> = {
  stripe: 'Pay with Stripe',
  kofi: 'Support on Ko-fi',
  buymeacoffee: 'Buy Me a Coffee',
};

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'kofi') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      </svg>
    );
  }
  if (provider === 'buymeacoffee') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </svg>
    );
  }
  // Stripe / default — heart icon
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function TipJarRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as TipJarData;
  if (!data.payment_url) return null;

  const label = data.button_label || PROVIDER_LABELS[data.provider] || 'Support Me';
  const displayAmount = data.amount ? ` — ${data.amount}` : '';

  function handleClick() {
    if (pageId) trackEvent(pageId, 'tip_click', { blockId: block.id });
  }

  return (
    <div className="scroll-reveal my-6 text-center">
      {block.title && (
        <h3
          className="text-sm font-bold mb-3"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      <a
        href={data.payment_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold"
        style={{
          background: 'var(--page-accent)',
          color: 'var(--page-bg)',
          fontFamily: 'var(--page-font-display)',
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease, box-shadow 200ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03) translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <ProviderIcon provider={data.provider} />
        {label}{displayAmount}
      </a>
    </div>
  );
}
