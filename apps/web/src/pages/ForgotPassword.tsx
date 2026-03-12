import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../components/PageHead';
import logoSrc from '../logo/BytLinks.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok && json.error) {
        setError(json.error);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <PageHead title="Reset password" description="Reset your BytLinks password." noIndex />
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-10">
          <img src={logoSrc} alt="BytLinks" className="h-28" />
        </Link>

        {submitted ? (
          <>
            <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
              Check your email
            </h1>
            <p className="font-body text-sm text-brand-text-secondary mb-8">
              If an account exists for <span className="font-medium text-brand-text">{email}</span>,
              we've sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="block w-full text-center font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                         bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
              Reset your password
            </h1>
            <p className="font-body text-sm text-brand-text-secondary mb-8">
              Enter your email and we'll send you a reset link.
            </p>

            {error && (
              <div className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block font-body text-sm font-medium text-brand-text mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                             bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                             transition-colors duration-fast
                             focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                  placeholder="you@example.com"
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
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="font-body text-sm text-brand-text-secondary text-center mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-brand-accent font-medium hover:text-brand-accent-hover transition-colors duration-fast">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
