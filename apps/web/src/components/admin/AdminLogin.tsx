import { useState } from 'react';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (secret: string) => Promise<boolean>;
  error: string | null;
}

export function AdminLogin({ onLogin, error }: AdminLoginProps) {
  const [secret, setSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim() || submitting) return;
    setSubmitting(true);
    await onLogin(secret);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-brand-border bg-brand-surface p-8"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-surface-alt flex items-center justify-center">
            <Lock className="w-5 h-5 text-brand-text-muted" />
          </div>
        </div>

        <h1 className="font-display text-lg font-700 text-brand-text text-center mb-6">
          Admin Access
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="font-body text-xs text-rose-500 text-center">{error}</p>
          </div>
        )}

        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter admin secret"
          autoFocus
          className="w-full px-4 py-2.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/40 mb-4"
        />

        <button
          type="submit"
          disabled={submitting || !secret.trim()}
          className="w-full px-4 py-2.5 rounded-lg bg-brand-accent text-white font-body text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Authenticating...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
