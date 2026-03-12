import { useState } from 'react';
import { X, Crown, Check } from 'lucide-react';

const PRO_FEATURES = [
  'All 19 content block types',
  'Up to 25 blocks per page',
  'Link scheduling & auto-expiry',
  'Remove BytLinks branding',
  'Priority support',
];

interface UpgradeModalProps {
  onClose: () => void;
  trigger?: string;
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/upgrade', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        if (json.data?.checkout_url) {
          window.location.href = json.data.checkout_url;
          return;
        }
        // Mock mode — reload to refresh plan
        window.location.reload();
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-brand-surface rounded-2xl border border-brand-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 pt-6 pb-5">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-brand-text-muted hover:text-brand-text transition-colors rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-lg font-800 tracking-tight text-brand-text">
              Upgrade to Pro
            </h2>
          </div>
          <p className="font-body text-sm text-brand-text-secondary">
            $9.99/month — cancel anytime
          </p>
        </div>

        {/* Features */}
        <div className="px-6 py-5">
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-body text-sm text-brand-text">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full font-body text-sm font-semibold px-4 py-3 rounded-xl
                       bg-brand-accent text-white
                       transition-all duration-fast hover:bg-brand-accent-hover hover:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redirecting...' : 'Upgrade now'}
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 font-body text-xs text-brand-text-muted hover:text-brand-text
                       transition-colors duration-fast py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
