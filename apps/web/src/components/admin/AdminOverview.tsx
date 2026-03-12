import { Users, FileText, Eye, MousePointerClick, LayoutGrid, Mail } from 'lucide-react';

interface OverviewData {
  total_users: number;
  new_users_30d: number;
  total_pages: number;
  published_pages: number;
  total_links: number;
  total_blocks: number;
  total_views: number;
  recent_views_30d: number;
  total_clicks: number;
  total_newsletter_signups: number;
  pending_verifications: number;
}

function StatCard({ label, value, sub, icon: Icon }: {
  label: string;
  value: number;
  sub?: string;
  icon: React.FC<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide">
          {label}
        </span>
        <Icon className="w-4 h-4 text-brand-text-muted" />
      </div>
      <p className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
        {value.toLocaleString()}
      </p>
      {sub && (
        <p className="font-body text-[11px] text-brand-text-muted">{sub}</p>
      )}
    </div>
  );
}

export function AdminOverview({ overview }: { overview: OverviewData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Users" value={overview.total_users} sub={`+${overview.new_users_30d} last 30d`} icon={Users} />
      <StatCard label="Pages" value={overview.total_pages} sub={`${overview.published_pages} published`} icon={FileText} />
      <StatCard label="Views (30d)" value={overview.recent_views_30d} sub={`${overview.total_views.toLocaleString()} total`} icon={Eye} />
      <StatCard label="Clicks" value={overview.total_clicks} icon={MousePointerClick} />
      <StatCard label="Blocks" value={overview.total_blocks} sub={`${overview.total_links.toLocaleString()} links`} icon={LayoutGrid} />
      <StatCard label="Newsletter" value={overview.total_newsletter_signups} sub={`${overview.pending_verifications} pending verify`} icon={Mail} />
    </div>
  );
}
