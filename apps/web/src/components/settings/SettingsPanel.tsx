import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePage } from '../../hooks/usePage';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, AlertTriangle } from 'lucide-react';
import { QrCodeSection } from './QrCodeSection';
import { VerificationSection } from './VerificationSection';

interface BillingStatus {
  plan: string;
  plan_name: string;
  price: number;
  has_payment_method: boolean;
}

export function SettingsPanel() {
  const { user, logout } = useAuth();
  const { page } = usePage();
  const navigate = useNavigate();
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

      {/* QR Code */}
      {page?.username && <QrCodeSection username={page.username} />}

      {/* Verification */}
      <VerificationSection />

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

      {/* Danger Zone — Delete Account */}
      <DeleteAccountSection
        username={page?.username}
        onDeleted={async () => { await logout(); navigate('/'); }}
      />
    </div>
  );
}

function DeleteAccountSection({ username, onDeleted }: { username?: string; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmationValid = confirmation === 'DELETE MY ACCOUNT';
  const canDelete = password.length > 0 && confirmationValid && !deleting;

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, confirmation }),
      });
      const json = await res.json();
      if (json.success) {
        onDeleted();
      } else {
        setError(json.error || 'Failed to delete account');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h2 className="font-display text-base font-700 tracking-tight text-red-700">
          Danger Zone
        </h2>
      </div>

      {!expanded ? (
        <>
          <p className="font-body text-sm text-red-600/80 mb-4">
            Permanently delete your account and all associated data.
          </p>
          <button
            onClick={() => setExpanded(true)}
            className="font-body text-sm font-medium px-4 py-2 rounded-lg
                       border border-red-300 text-red-600
                       hover:bg-red-100 transition-colors duration-fast"
          >
            Delete account...
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-red-100 border border-red-200 px-4 py-3 space-y-2">
            <p className="font-body text-sm font-semibold text-red-800">
              This action is permanent and cannot be undone.
            </p>
            <ul className="font-body text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Your profile, links, content blocks, and analytics will be permanently deleted</li>
              <li>Your avatar and uploaded files will be removed</li>
              {username && (
                <li>
                  The handle <span className="font-semibold">bytlinks.com/{username}</span> will be released and can be claimed by anyone
                </li>
              )}
              <li>This cannot be reversed — there is no recovery option</li>
            </ul>
          </div>

          <div>
            <label className="block font-body text-sm font-medium text-red-700 mb-1.5">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-red-300
                         bg-white text-brand-text placeholder:text-brand-text-muted
                         focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder="Your password"
            />
          </div>

          <div>
            <label className="block font-body text-sm font-medium text-red-700 mb-1.5">
              Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-red-300
                         bg-white text-brand-text placeholder:text-brand-text-muted
                         focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder="DELETE MY ACCOUNT"
            />
          </div>

          {error && (
            <div className="font-body text-sm text-red-600 bg-red-100 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                         bg-red-600 text-white
                         transition-colors duration-fast hover:bg-red-700
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Permanently delete my account'}
            </button>
            <button
              onClick={() => { setExpanded(false); setPassword(''); setConfirmation(''); setError(null); }}
              className="font-body text-sm font-medium px-4 py-2.5 rounded-lg
                         text-brand-text-muted hover:text-brand-text transition-colors duration-fast"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
