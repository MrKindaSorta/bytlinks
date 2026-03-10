import { useState } from 'react';
import { Check } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { NewsletterData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

export function NewsletterRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as NewsletterData;
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/public/newsletter/${block.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success && pageId) trackEvent(pageId, 'newsletter_signup', { blockId: block.id });
      setStatus(json.success ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-5 text-center"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      <h3
        className="text-base font-bold tracking-tight mb-1"
        style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
      >
        {data.heading || 'Stay in the loop'}
      </h3>
      {data.subtext && (
        <p className="text-xs mb-3" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
          {data.subtext}
        </p>
      )}
      <div
        style={{
          maxHeight: status === 'success' ? '0px' : '100px',
          opacity: status === 'success' ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height 400ms ease, opacity 300ms ease',
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-xs mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border-0"
            style={{
              background: 'var(--page-bg)',
              color: 'var(--page-text)',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            style={{
              background: 'var(--page-accent)',
              color: 'var(--page-bg)',
              opacity: status === 'loading' ? 0.6 : 1,
              transition: 'opacity 150ms ease, transform 150ms ease',
              transform: status === 'loading' ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            {status === 'loading' ? '...' : (data.button_label || 'Subscribe')}
          </button>
        </form>
      </div>
      <div
        style={{
          maxHeight: status === 'success' ? '60px' : '0px',
          opacity: status === 'success' ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 400ms ease, opacity 300ms ease 100ms',
        }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4" style={{ color: 'var(--page-accent)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--page-accent)' }}>
            {(data as NewsletterData & { success_message?: string }).success_message || "You're subscribed!"}
          </p>
        </div>
      </div>
      {status === 'error' && (
        <p
          className="text-xs mt-2"
          style={{
            color: 'var(--page-text)',
            opacity: 0.5,
            animation: 'fadeIn 200ms ease forwards',
          }}
        >
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
