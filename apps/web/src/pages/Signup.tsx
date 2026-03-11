import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logoSrc from '../logo/BytLinks.png';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(searchParams.get('username') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signup(email, password, username);
      navigate('/dashboard?showTemplates=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-10">
          <img src={logoSrc} alt="BytLinks" className="h-28" />
        </Link>

        <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
          Create your page
        </h1>
        <p className="font-body text-sm text-brand-text-secondary mb-8">
          Free forever. No credit card needed.
        </p>

        {error && (
          <div className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block font-body text-sm font-medium text-brand-text mb-1.5">
              Username
            </label>
            <div className="flex items-center gap-0">
              <span className="font-body text-sm text-brand-text-muted bg-brand-surface-alt border border-r-0 border-brand-border rounded-l-lg px-3 py-2.5">
                bytlinks.com/
              </span>
              <input
                id="username"
                type="text"
                required
                pattern="[a-z0-9_-]+"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="flex-1 font-body text-sm px-3 py-2.5 rounded-r-lg border border-brand-border
                           bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                           transition-colors duration-fast
                           focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                placeholder="yourname"
              />
            </div>
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                         bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                         transition-colors duration-fast
                         focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="8+ characters"
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
            {loading ? 'Creating your page...' : 'Create my page'}
          </button>
        </form>

        <p className="font-body text-sm text-brand-text-secondary text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-accent font-medium hover:text-brand-accent-hover transition-colors duration-fast">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
