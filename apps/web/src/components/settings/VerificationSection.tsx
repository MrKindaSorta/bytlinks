import { useState, useEffect } from 'react';
import { BadgeCheck, Clock, Link2, CalendarDays } from 'lucide-react';

interface VerificationStatus {
  verified: boolean;
  verified_at: number | null;
  eligible: boolean;
  criteria: {
    account_age_days: number;
    account_age_required: number;
    link_count: number;
    links_required: number;
  };
  pending_request: { id: string; status: string; created_at: number } | null;
}

export function VerificationSection() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetch('/api/verification/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStatus(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRequest() {
    setRequesting(true);
    try {
      const res = await fetch('/api/verification/request', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setStatus((prev) =>
          prev ? { ...prev, pending_request: { id: json.data.id, status: 'pending', created_at: Math.floor(Date.now() / 1000) } } : prev
        );
      }
    } catch {
      // silent
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return null;
  if (!status) return null;

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <BadgeCheck className="w-5 h-5 text-brand-accent" />
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
          Verification
        </h2>
      </div>

      {status.verified ? (
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="font-body text-sm font-medium text-brand-text">Verified</p>
            {status.verified_at && (
              <p className="font-body text-xs text-brand-text-muted">
                Since {new Date(status.verified_at * 1000).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ) : status.pending_request ? (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="font-body text-sm text-amber-800">
            Verification request pending review.
          </p>
        </div>
      ) : (
        <>
          <p className="font-body text-sm text-brand-text-secondary mb-4">
            Get a verified badge on your public page. You need to meet the following criteria:
          </p>
          <div className="space-y-2 mb-5">
            <CriteriaRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Account age"
              current={`${status.criteria.account_age_days} days`}
              required={`${status.criteria.account_age_required} days`}
              met={status.criteria.account_age_days >= status.criteria.account_age_required}
            />
            <CriteriaRow
              icon={<Link2 className="w-4 h-4" />}
              label="Links added"
              current={String(status.criteria.link_count)}
              required={String(status.criteria.links_required)}
              met={status.criteria.link_count >= status.criteria.links_required}
            />
          </div>
          <button
            onClick={handleRequest}
            disabled={!status.eligible || requesting}
            className="w-full font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                       bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting ? 'Submitting...' : status.eligible ? 'Request Verification' : 'Not yet eligible'}
          </button>
        </>
      )}
    </section>
  );
}

function CriteriaRow({
  icon,
  label,
  current,
  required,
  met,
}: {
  icon: React.ReactNode;
  label: string;
  current: string;
  required: string;
  met: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={met ? 'text-emerald-500' : 'text-brand-text-muted'}>{icon}</span>
      <span className="font-body text-sm text-brand-text flex-1">{label}</span>
      <span className={`font-body text-xs font-medium ${met ? 'text-emerald-600' : 'text-brand-text-muted'}`}>
        {current} / {required}
      </span>
    </div>
  );
}
