import { UserPlus, Eye } from 'lucide-react';

interface ActivityFeed {
  recent_signups: { id: string; email: string; created_at: number; username: string | null }[];
  active_pages: { username: string; display_name: string | null; views: number }[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AdminActivityFeed({ feed }: { feed: ActivityFeed }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Activity Feed
      </h3>

      <h4 className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-3">
        Recent Signups
      </h4>
      {feed.recent_signups.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted mb-4">No signups yet.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {feed.recent_signups.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5 text-brand-accent shrink-0" />
              <span className="font-body text-xs text-brand-text truncate">
                {u.username || u.email}
              </span>
              <span className="font-body text-[11px] text-brand-text-muted ml-auto shrink-0">
                {timeAgo(u.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <h4 className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-3">
        Active Pages (24h)
      </h4>
      {feed.active_pages.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted">No recent activity.</p>
      ) : (
        <div className="space-y-2">
          {feed.active_pages.map((p) => (
            <div key={p.username} className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-brand-text-muted shrink-0" />
              <span className="font-body text-xs text-brand-text truncate">
                {p.display_name || p.username}
                <span className="text-brand-text-muted ml-1">/{p.username}</span>
              </span>
              <span className="font-body text-xs text-brand-text-muted tabular-nums ml-auto shrink-0">
                {p.views} views
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
