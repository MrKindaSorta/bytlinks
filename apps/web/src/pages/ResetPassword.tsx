import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHead } from '../components/PageHead';
import logoSrc from '../logo/BytLinks.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <PageHead title="Reset password" noIndex />
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="flex justify-center mb-10">
            <img src={logoSrc} alt="BytLinks" className="h-28" />
          </Link>
          <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-2">
            Invalid reset link
          </h1>
          <p className="font-body text-sm text-brand-text-secondary mb-6">
            This reset link is missing or malformed. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block font-body text-sm font-semibold px-6 py-2.5 rounded-lg
                       bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.error || 'Failed to reset password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <PageHead title="Set new password" noIndex />
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-10">
          <img src={logoSrc} alt="BytLinks" className="h-28" />
        </Link>

        {success ? (
          <>
            <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
              Password reset!
            </h1>
            <p className="font-body text-sm text-brand-text-secondary mb-8">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="block w-full text-center font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                         bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
              Set new password
            </h1>
            <p className="font-body text-sm text-brand-text-secondary mb-8">
              Choose a strong password for your account.
            </p>

            {error && (
              <div className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block font-body text-sm font-medium text-brand-text mb-1.5">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                             bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                             transition-colors duration-fast
                             focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block font-body text-sm font-medium text-brand-text mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                             bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                             transition-colors duration-fast
                             focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                           bg-brand-accent text-white
                           transition-colors duration-fast hover:bg-brand-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
