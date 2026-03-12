import { useState } from 'react';
import { BadgeCheck, X } from 'lucide-react';
import type { VerificationRequest } from '../../hooks/useAdminAnalytics';

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AdminVerificationQueue({
  queue,
  onRefresh,
}: {
  queue: VerificationRequest[];
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState<string | null>(null);

  const handleAction = async (userId: string, action: 'verify' | 'unverify') => {
    setActing(userId);
    try {
      await fetch(`/api/bytadmin/users/${userId}/${action}`, {
        method: 'PUT',
        credentials: 'include',
      });
      onRefresh();
    } catch {
      // Silently fail
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Verification Queue ({queue.length})
      </h3>

      {queue.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {queue.map((req) => (
            <div key={req.id} className="rounded-lg border border-brand-border/50 p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-body text-xs font-medium text-brand-text">
                    {req.display_name || req.email}
                    {req.username && (
                      <span className="text-brand-text-muted ml-1">/{req.username}</span>
                    )}
                  </p>
                  <p className="font-body text-[11px] text-brand-text-muted">{req.email}</p>
                </div>
                <span className="font-body text-[11px] text-brand-text-muted shrink-0">{timeAgo(req.created_at)}</span>
              </div>

              {req.reason && (
                <p className="font-body text-xs text-brand-text mb-2">{req.reason}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(req.user_id, 'verify')}
                  disabled={acting === req.user_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-accent text-white font-body text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <BadgeCheck className="w-3 h-3" />
                  Approve
                </button>
                <button
                  onClick={() => handleAction(req.user_id, 'unverify')}
                  disabled={acting === req.user_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-border font-body text-[11px] font-medium text-brand-text-muted hover:bg-brand-surface-alt disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
