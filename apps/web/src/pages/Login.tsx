import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PageHead } from '../components/PageHead';
import logoSrc from '../logo/BytLinks.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <PageHead title="Log in" description="Log in to your BytLinks account." noIndex />
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-10">
          <img src={logoSrc} alt="BytLinks" className="h-28" />
        </Link>

        <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
          Welcome back
        </h1>
        <p className="font-body text-sm text-brand-text-secondary mb-8">
          Log in to manage your page.
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

          <div>
            <label htmlFor="password" className="block font-body text-sm font-medium text-brand-text mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                         bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                         transition-colors duration-fast
                         focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="Your password"
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
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="font-body text-sm text-brand-text-secondary text-center mt-6">
          No account yet?{' '}
          <Link to="/signup" className="text-brand-accent font-medium hover:text-brand-accent-hover transition-colors duration-fast">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
