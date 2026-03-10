import type { BlockRendererProps } from './blockRendererRegistry';
import type { TipJarData, PaymentOption, TipJarProvider } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

/* ── Provider metadata ──────────────────────────────────────── */

const PROVIDER_META: Record<TipJarProvider, { label: string; color: string }> = {
  stripe: { label: 'Pay with Stripe', color: '#635bff' },
  kofi: { label: 'Support on Ko-fi', color: '#FF5E5B' },
  buymeacoffee: { label: 'Buy Me a Coffee', color: '#FFDD00' },
  paypal: { label: 'PayPal', color: '#003087' },
  cashapp: { label: 'Cash App', color: '#00D632' },
  venmo: { label: 'Venmo', color: '#3D95CE' },
};

function ProviderIcon({ provider }: { provider: TipJarProvider }) {
  if (provider === 'kofi' || provider === 'buymeacoffee') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        {provider === 'buymeacoffee' && (
          <>
            <line x1="6" y1="2" x2="6" y2="4" />
            <line x1="10" y1="2" x2="10" y2="4" />
            <line x1="14" y1="2" x2="14" y2="4" />
          </>
        )}
      </svg>
    );
  }
  if (provider === 'paypal') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 11C4.5 11 3 9.5 3 7.5C3 5 5 3 8 3h7c2 0 3 1 3 3s-1 4-4 4H7z" />
        <path d="M9 11l-1.5 8H11c3 0 5-1.5 6-4.5" />
      </svg>
    );
  }
  if (provider === 'cashapp') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  if (provider === 'venmo') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3l7 18 7-18" />
        <path d="M9 12h6" />
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

/* ── Parse amount string to number for goal bar ─────────────── */

function parseAmount(str?: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

/* ── Normalise to multi-option format ───────────────────────── */

function resolveOptions(data: TipJarData): PaymentOption[] {
  if (data.options && data.options.length > 0) return data.options;
  if (data.payment_url) {
    return [{
      id: 'legacy',
      provider: (data.provider as TipJarProvider) || 'stripe',
      url: data.payment_url,
      label: data.button_label,
      suggested_amount: data.amount,
    }];
  }
  return [];
}

/* ── Main Renderer ──────────────────────────────────────────── */

export function TipJarRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as TipJarData;
  const options = resolveOptions(data);

  if (options.length === 0 && !data.goal_enabled) return null;

  function handleClick(_opt: PaymentOption) {
    if (pageId) trackEvent(pageId, 'tip_click', { blockId: block.id });
  }

  const goalTarget = parseAmount(data.goal_target);
  const goalCurrent = parseAmount(data.goal_current);
  const goalPct = goalTarget > 0 ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0;

  return (
    <div className="scroll-reveal my-6">
      {block.title && (
        <h3
          className="text-sm font-bold mb-2 text-center"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}

      {/* Message */}
      {data.message && (
        <p
          className="text-xs text-center mb-4 leading-relaxed"
          style={{ color: 'var(--page-text)', opacity: 0.7 }}
        >
          {data.message}
        </p>
      )}

      {/* Goal section */}
      {data.goal_enabled && goalTarget > 0 && (
        <div className="mb-4 rounded-xl p-3 space-y-2" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.06))', border: '1px solid rgba(128,128,128,0.1)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--page-text)' }}>
            <span className="font-semibold" style={{ fontFamily: 'var(--page-font-display)' }}>
              {data.goal_label || 'Goal'}
            </span>
            <span style={{ opacity: 0.6 }}>
              {data.goal_current || '0'} / {data.goal_target} ({goalPct}%)
            </span>
          </div>
          {data.goal_show_bar !== false && (
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 6, background: 'rgba(128,128,128,0.15)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${goalPct}%`,
                  background: 'var(--page-accent)',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Payment option buttons */}
      {options.length > 0 && (
        <div className={`flex ${options.length === 1 ? 'justify-center' : 'flex-col gap-2'}`}>
          {options.map((opt) => {
            const meta = PROVIDER_META[opt.provider] || { label: 'Support', color: 'var(--page-accent)' };
            const label = opt.label || meta.label;
            const displayLabel = opt.suggested_amount ? `${label} — ${opt.suggested_amount}` : label;

            return (
              <a
                key={opt.id}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick(opt)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-bold"
                style={{
                  background: 'var(--page-accent)',
                  color: 'var(--page-bg)',
                  fontFamily: 'var(--page-font-display)',
                  transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease, box-shadow 200ms ease',
                  opacity: opt.url ? 1 : 0.4,
                  pointerEvents: opt.url ? 'auto' : 'none',
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
                <ProviderIcon provider={opt.provider} />
                {displayLabel}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
