import { useState } from 'react';
import { Mail, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { TileSpinner } from './TileSpinner';
import type { BlockPerformanceData } from '../../hooks/useAnalytics';

interface Props {
  newsletter: BlockPerformanceData;
  refreshing: boolean;
}

export function NewsletterCard({ newsletter, refreshing }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [subscribers, setSubscribers] = useState<{ email: string; created_at: string }[] | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [copied, setCopied] = useState(false);

  const subscriberCount = newsletter.newsletter_count ?? newsletter.count;

  async function loadSubscribers() {
    if (subscribers) {
      setExpanded(!expanded);
      return;
    }
    setLoadingSubs(true);
    setExpanded(true);
    try {
      const res = await fetch(`/api/analytics/newsletter-subscribers?block_id=${newsletter.block_id}`);
      const json = await res.json();
      if (json.success) {
        setSubscribers(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoadingSubs(false);
    }
  }

  async function exportEmails() {
    if (!subscribers) return;
    const csv = ['Email,Date Subscribed', ...subscribers.map((s) => `${s.email},${s.created_at}`)].join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download as file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newsletter-subscribers.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-text-muted" />
          <h3 className="font-display text-sm font-700 tracking-tight text-brand-text">
            Newsletter{newsletter.title ? `: ${newsletter.title}` : ''}
          </h3>
        </div>
        <span className="font-display text-lg font-700 text-brand-text tabular-nums">
          {subscriberCount}
          <span className="font-body text-xs font-normal text-brand-text-muted ml-1">subscribers</span>
        </span>
      </div>

      <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        <button
          onClick={loadSubscribers}
          className="flex items-center gap-1 font-body text-xs text-brand-accent hover:underline mt-2"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide' : 'View'} subscribers
        </button>

        {expanded && (
          <div className="mt-3 border-t border-brand-border pt-3">
            {loadingSubs ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
              </div>
            ) : subscribers && subscribers.length > 0 ? (
              <>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={exportEmails}
                    className="flex items-center gap-1 font-body text-[11px] font-medium text-brand-text-muted hover:text-brand-text transition-colors duration-150"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied CSV' : 'Export CSV'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {subscribers.map((sub) => (
                    <div key={sub.email} className="flex items-center justify-between py-1">
                      <span className="font-body text-xs text-brand-text truncate">{sub.email}</span>
                      <span className="font-body text-[10px] text-brand-text-muted tabular-nums flex-shrink-0 ml-3">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-body text-xs text-brand-text-muted py-2">No subscribers yet.</p>
            )}
          </div>
        )}
      </div>

      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner />
        </div>
      )}
    </div>
  );
}
