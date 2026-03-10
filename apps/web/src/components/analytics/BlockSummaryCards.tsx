import { MousePointerClick, Zap, TrendingUp } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';
import { BLOCK_ICONS, BLOCK_TYPE_LABELS } from './blockConstants';
import type { BlockPerformanceSummary } from '../../hooks/useAnalytics';

interface Props {
  summary: BlockPerformanceSummary;
  totalViews: number;
}

export function BlockSummaryCards({ summary, totalViews }: Props) {
  const countUpKey = useCountUpKey();
  const refreshing = useRefreshing();

  const engagementRate = totalViews > 0
    ? Math.round((summary.total_interactions / totalViews) * 1000) / 10
    : 0;

  const animatedTotal = useCountUp(summary.total_interactions, countUpKey, 1200, 0);
  const animatedTopCount = useCountUp(summary.top_block?.count ?? 0, countUpKey, 1200, 150);
  const animatedRate = useCountUp(engagementRate, countUpKey, 1200, 300);

  const TopIcon = summary.top_block
    ? (BLOCK_ICONS[summary.top_block.block_type] ?? MousePointerClick)
    : MousePointerClick;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Interactions */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
        <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-brand-text-muted" />
            <span className="font-body text-xs text-brand-text-muted">Total Interactions</span>
          </div>
          <span className="font-display text-2xl font-700 text-brand-text tabular-nums">
            {animatedTotal}
          </span>
        </div>
        {refreshing && (
          <div className="absolute inset-0 flex items-center justify-center"><TileSpinner /></div>
        )}
      </div>

      {/* Most Engaged Block */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
        <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          <div className="flex items-center gap-2 mb-2">
            <TopIcon className="w-4 h-4 text-brand-text-muted" />
            <span className="font-body text-xs text-brand-text-muted">Most Engaged</span>
          </div>
          {summary.top_block ? (
            <>
              <span className="font-display text-2xl font-700 text-brand-text tabular-nums">
                {animatedTopCount}
              </span>
              <p className="font-body text-xs text-brand-text-muted mt-1 truncate">
                {summary.top_block.title || BLOCK_TYPE_LABELS[summary.top_block.block_type] || summary.top_block.block_type}
              </p>
            </>
          ) : (
            <span className="font-body text-sm text-brand-text-muted">--</span>
          )}
        </div>
        {refreshing && (
          <div className="absolute inset-0 flex items-center justify-center"><TileSpinner /></div>
        )}
      </div>

      {/* Engagement Rate */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
        <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-brand-text-muted" />
            <span className="font-body text-xs text-brand-text-muted">Engagement Rate</span>
          </div>
          <span className="font-display text-2xl font-700 text-brand-text tabular-nums">
            {animatedRate}%
          </span>
        </div>
        {refreshing && (
          <div className="absolute inset-0 flex items-center justify-center"><TileSpinner /></div>
        )}
      </div>
    </div>
  );
}
