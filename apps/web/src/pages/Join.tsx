import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Users, ArrowRight } from 'lucide-react';
import { PageHead } from '../components/PageHead';
import logoSrc from '../logo/BytLinks.png';

interface BusinessInfo {
  business_name: string;
  business_username: string;
  business_avatar_key: string | null;
  business_bio: string | null;
  business_job_title: string | null;
}

/**
 * /join/:token — Invite link landing page.
 * Logged-in users → auto-redirect to dashboard with ?joinToken=TOKEN&tab=affiliations
 * Logged-out users → beautiful landing page with business info + CTA to sign up / log in
 */
export default function Join() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // Resolve the token via public endpoint (no auth required)
  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/invite/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setBusiness(json.data);
        } else {
          setError(json.error || 'Invalid invite link');
        }
      })
      .catch(() => setError('Failed to verify invite link'))
      .finally(() => setResolving(false));
  }, [token]);

  // Auto-redirect authenticated users
  useEffect(() => {
    if (isLoading || !token || resolving) return;
    if (error) return;
    if (isAuthenticated) {
      navigate(`/dashboard?tab=affiliations&joinToken=${token}`, { replace: true });
    }
  }, [isAuthenticated, isLoading, token, navigate, error, resolving]);

  // ── Loading state ──
  if (resolving || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <PageHead title="Team Invite" noIndex />
        <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <PageHead title="Invalid Invite" noIndex />
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="flex justify-center mb-10">
            <img src={logoSrc} alt="BytLinks" className="h-20" />
          </Link>
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-8">
            <Users className="w-10 h-10 mx-auto text-brand-text-muted mb-4" />
            <h1 className="font-display text-xl font-800 text-brand-text mb-2">
              Invite not found
            </h1>
            <p className="font-body text-sm text-brand-text-secondary mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
            >
              Go to BytLinks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated users waiting for redirect ──
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <PageHead title="Joining team..." noIndex />
        <Loader2 className="w-6 h-6 animate-spin text-brand-accent mb-4" />
        {business && (
          <p className="font-body text-sm text-brand-text-secondary">
            Joining <span className="font-semibold text-brand-text">{business.business_name}</span>...
          </p>
        )}
      </div>
    );
  }

  // ── Landing page for unauthenticated users ──
  const avatarSrc = business?.business_avatar_key
    ? `/api/public/avatar/${business.business_avatar_key}`
    : null;
  const name = business?.business_name || 'Someone';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4 py-12">
      <PageHead
        title={`${name} invited you to their team`}
        description={`Join ${name}'s team on BytLinks — create your free page and connect.`}
        noIndex
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex justify-center mb-10">
          <img src={logoSrc} alt="BytLinks" className="h-20" />
        </Link>

        {/* Invite card */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-8 text-center mb-6">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-brand-accent/10"
              />
            ) : (
              <span className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold bg-brand-accent/10 text-brand-accent ring-4 ring-brand-accent/10">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Business info */}
          <h1 className="font-display text-xl font-800 tracking-tight text-brand-text mb-1">
            {name}
          </h1>
          {business?.business_job_title && (
            <p className="font-body text-sm text-brand-text-secondary mb-1">
              {business.business_job_title}
            </p>
          )}
          <p className="font-body text-xs text-brand-text-muted mb-5">
            @{business?.business_username}
          </p>

          {/* Divider */}
          <div className="w-12 h-px bg-brand-border mx-auto mb-5" />

          {/* Invite message */}
          <p className="font-body text-sm text-brand-text-secondary mb-6 leading-relaxed">
            <span className="font-semibold text-brand-text">{name}</span> has invited you
            to join their team on BytLinks. Sign up for free to accept!
          </p>

          {/* Primary CTA — Sign up */}
          <Link
            to={`/signup?joinToken=${token}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                       bg-brand-accent text-white font-body text-sm font-semibold
                       hover:bg-brand-accent-hover transition-colors duration-150"
          >
            Create your free account
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Secondary CTA — Log in */}
          <p className="font-body text-sm text-brand-text-secondary mt-4">
            Already have an account?{' '}
            <Link
              to={`/login?joinToken=${token}`}
              className="font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Footer tagline */}
        <p className="text-center font-body text-xs text-brand-text-muted">
          BytLinks — your free link-in-bio page
        </p>
      </div>
    </div>
  );
}
