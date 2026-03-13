import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Users } from 'lucide-react';
import { PageHead } from '../components/PageHead';

/**
 * /join/:token — Invite link landing page.
 * Logged-in users → redirect to dashboard with ?joinToken=TOKEN&tab=affiliations
 * Logged-out users → redirect to login/signup with ?joinToken=TOKEN preserved
 */
export default function Join() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the token to show business name while deciding where to redirect
  useEffect(() => {
    if (!token) return;
    fetch('/api/affiliations/join-by-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setBusinessName(json.data.business_name);
        } else {
          setError(json.error || 'Invalid invite link');
        }
      })
      .catch(() => setError('Failed to verify invite link'));
  }, [token]);

  // Redirect once auth state is known
  useEffect(() => {
    if (isLoading || !token) return;
    if (error) return; // Don't redirect on invalid tokens

    if (isAuthenticated) {
      navigate(`/dashboard?tab=affiliations&joinToken=${token}`, { replace: true });
    } else {
      navigate(`/login?joinToken=${token}`, { replace: true });
    }
  }, [isAuthenticated, isLoading, token, navigate, error]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <PageHead title="Invalid Invite" noIndex />
        <Users className="w-10 h-10 text-brand-text-muted mb-4" />
        <h1 className="font-display text-xl font-800 text-brand-text mb-2">Invalid invite</h1>
        <p className="font-body text-sm text-brand-text-secondary mb-6 text-center max-w-sm">{error}</p>
        <a
          href="/"
          className="font-body text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
        >
          Go to BytLinks
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
      <PageHead title="Joining team..." noIndex />
      <Loader2 className="w-6 h-6 animate-spin text-brand-accent mb-4" />
      {businessName && (
        <p className="font-body text-sm text-brand-text-secondary">
          Joining <span className="font-semibold text-brand-text">{businessName}</span>...
        </p>
      )}
    </div>
  );
}
