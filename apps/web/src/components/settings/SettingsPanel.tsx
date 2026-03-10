import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Crown, Check } from 'lucide-react';

interface BillingStatus {
  plan: string;
  plan_name: string;
  price: number;
  has_payment_method: boolean;
}

export function SettingsPanel() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBilling(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/billing/upgrade', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setBilling((prev) => prev ? { ...prev, plan: 'pro', plan_name: 'Pro', price: 9, has_payment_method: true } : prev);
        // Reload to refresh JWT-based user state
        window.location.reload();
      }
    } catch {
      // Silent fail
    } finally {
      setUpgrading(false);
    }
  }

  async function handleDowngrade() {
    setDowngrading(true);
    try {
      const res = await fetch('/api/billing/downgrade', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setBilling((prev) => prev ? { ...prev, plan: 'free', plan_name: 'Free', price: 0, has_payment_method: false } : prev);
        window.location.reload();
      }
    } catch {
      // Silent fail
    } finally {
      setDowngrading(false);
    }
  }

  const isPro = billing?.plan === 'pro';

  const proFeatures = [
    'Remove BytLinks branding',
    'Full analytics dashboard',
    'Priority support',
    'Custom domain (coming soon)',
  ];

  return (
    <div className="space-y-8">
      {/* Account info */}
      <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text mb-4">
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-brand-text-muted">Email</span>
            <span className="font-body text-sm font-medium text-brand-text">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-brand-text-muted">Plan</span>
            <span className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-brand-text">
              {isPro && <Crown className="w-3.5 h-3.5 text-amber-500" />}
              {billing?.plan_name ?? 'Free'}
            </span>
          </div>
        </div>
      </section>

      {/* Plan / Upgrade */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isPro ? (
        <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
              Pro Plan
            </h2>
          </div>
          <p className="font-body text-sm text-brand-text-secondary mb-4">
            You're on the Pro plan. Thank you for supporting BytLinks.
          </p>
          <ul className="space-y-2 mb-6">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="font-body text-sm text-brand-text">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleDowngrade}
            disabled={downgrading}
            className="font-body text-xs font-medium text-brand-text-muted
                       hover:text-brand-text transition-colors duration-fast
                       disabled:opacity-50"
          >
            {downgrading ? 'Processing...' : 'Downgrade to Free'}
          </button>
        </section>
      ) : (
        <section className="rounded-xl border-2 border-brand-accent/30 bg-brand-surface p-6">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
              Upgrade to Pro
            </h2>
          </div>
          <p className="font-body text-sm text-brand-text-secondary mb-1">
            $9/month
          </p>
          <p className="font-body text-xs text-brand-text-muted mb-5">
            Cancel anytime. No contracts.
          </p>
          <ul className="space-y-2 mb-6">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="font-body text-sm text-brand-text">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                       bg-brand-accent text-white
                       transition-colors duration-fast hover:bg-brand-accent-hover
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upgrading ? 'Processing...' : 'Upgrade now'}
          </button>
          <p className="font-body text-[11px] text-brand-text-muted text-center mt-3">
            This is a demo. No real payment is processed.
          </p>
        </section>
      )}
    </div>
  );
}
