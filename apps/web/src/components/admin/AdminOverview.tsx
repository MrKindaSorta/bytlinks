import { Users, FileText, Eye, MousePointerClick, LayoutGrid, Mail, TrendingUp, TrendingDown, Percent, Target } from 'lucide-react';
import type { OverviewData } from '../../hooks/useAdminAnalytics';

function TrendCard({ label, value, prevValue, sub, icon: Icon, formatValue }: {
  label: string;
  value: number;
  prevValue?: number;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  formatValue?: (v: number) => string;
}) {
  const display = formatValue ? formatValue(value) : value.toLocaleString();
  const hasTrend = prevValue !== undefined && prevValue > 0;
  const changePct = hasTrend ? Math.round(((value - prevValue!) / prevValue!) * 1000) / 10 : null;
  const isUp = changePct !== null && changePct > 0;
  const isDown = changePct !== null && changePct < 0;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-[10px] font-medium text-brand-text-muted uppercase tracking-wide">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-brand-text-muted" />
      </div>
      <p className="font-display text-xl font-800 tracking-tight text-brand-text mb-1">
        {display}
      </p>
      <div className="flex items-center gap-1.5">
        {changePct !== null && (
          <span className={`inline-flex items-center gap-0.5 font-body text-[10px] font-medium ${
            isUp ? 'text-emerald-600' : isDown ? 'text-rose-500' : 'text-brand-text-muted'
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : null}
            {isUp ? '+' : ''}{changePct}%
          </span>
        )}
        {sub && (
          <span className="font-body text-[10px] text-brand-text-muted">{sub}</span>
        )}
      </div>
    </div>
  );
}

export function AdminOverview({ overview }: { overview: OverviewData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      <TrendCard
        label="Users"
        value={overview.total_users}
        sub={`+${overview.new_users_30d} last 30d`}
        icon={Users}
      />
      <TrendCard
        label="New Users (30d)"
        value={overview.new_users_30d}
        prevValue={overview.prev_users_30d}
        icon={Users}
      />
      <TrendCard
        label="Views (30d)"
        value={overview.recent_views_30d}
        prevValue={overview.prev_views_30d}
        sub={`${overview.total_views.toLocaleString()} total`}
        icon={Eye}
      />
      <TrendCard
        label="Clicks (30d)"
        value={overview.recent_clicks_30d}
        prevValue={overview.prev_clicks_30d}
        icon={MousePointerClick}
      />
      <TrendCard
        label="Pages"
        value={overview.total_pages}
        sub={`${overview.published_pages} published`}
        icon={FileText}
      />
      <TrendCard
        label="Publish Rate"
        value={overview.signup_to_publish_rate}
        formatValue={(v) => `${v}%`}
        icon={Target}
      />
      <TrendCard
        label="CTR"
        value={overview.platform_ctr}
        formatValue={(v) => `${v}%`}
        icon={Percent}
      />
      <TrendCard
        label="Blocks"
        value={overview.total_blocks}
        sub={`${overview.total_links.toLocaleString()} links`}
        icon={LayoutGrid}
      />
      <TrendCard
        label="Newsletter"
        value={overview.total_newsletter_signups}
        icon={Mail}
      />
      <TrendCard
        label="Verify Queue"
        value={overview.pending_verifications}
        icon={Users}
      />
    </div>
  );
}
