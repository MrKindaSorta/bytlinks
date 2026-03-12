import { Activity, Clock, Zap } from 'lucide-react';
import type { EngagementData } from '../../hooks/useAdminAnalytics';

export function AdminEngagementMetrics({ data, totalViews }: { data: EngagementData; totalViews: number }) {
  const interactionRate = totalViews > 0
    ? Math.round((data.total_interactions / totalViews) * 10000) / 10
    : 0;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Engagement Health
      </h3>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-brand-surface-alt p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-brand-accent" />
            <span className="font-body text-[10px] text-brand-text-muted uppercase">Active Pages</span>
          </div>
          <p className="font-display text-lg font-800 text-brand-text">{data.active_pages.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-brand-surface-alt p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="font-body text-[10px] text-brand-text-muted uppercase">Stale Pages</span>
          </div>
          <p className="font-display text-lg font-800 text-brand-text">{data.stale_pages.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-brand-surface-alt p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-brand-accent" />
            <span className="font-body text-[10px] text-brand-text-muted uppercase">Int. Rate</span>
          </div>
          <p className="font-display text-lg font-800 text-brand-text">{interactionRate}‰</p>
        </div>
      </div>

      {/* Interaction breakdown */}
      {data.interaction_breakdown.length > 0 && (
        <div>
          <h4 className="font-body text-[11px] font-medium text-brand-text-muted mb-2">
            Interaction Breakdown
          </h4>
          <div className="space-y-1.5">
            {data.interaction_breakdown.map((item) => {
              const maxCount = data.interaction_breakdown[0]?.count ?? 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.event_type} className="flex items-center gap-2">
                  <span className="w-24 font-body text-[11px] text-brand-text truncate">{item.event_type}</span>
                  <div className="flex-1 h-3 rounded-full bg-brand-surface-alt overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-accent/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-body text-[11px] text-brand-text-muted w-12 text-right">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
