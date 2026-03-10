import { MousePointerClick } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';
import { BLOCK_ICONS, BLOCK_TYPE_LABELS } from './blockConstants';
import type { BlockPerformanceData } from '../../hooks/useAnalytics';

interface Props {
  blockId: string;
  blockType: string;
  title: string | null;
  events: BlockPerformanceData[];
  maxCount: number;
  delay: number;
}

export function BlockCard({ blockType, title, events, maxCount, delay }: Props) {
  const refreshing = useRefreshing();
  const countUpKey = useCountUpKey();
  const totalCount = events.reduce((s, e) => s + e.count, 0);
  const animated = useCountUp(totalCount, countUpKey, 1200, delay);

  const Icon = BLOCK_ICONS[blockType] ?? MousePointerClick;
  const typeLabel = BLOCK_TYPE_LABELS[blockType] ?? blockType;
  const primaryLabel = events.length === 1 ? events[0].metric_label : 'Interactions';
  const barWidth = maxCount > 0 ? (totalCount / maxCount) * 100 : 0;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-brand-text-muted flex-shrink-0" />
        <span className="font-body text-xs font-medium text-brand-text truncate">
          {title || typeLabel}
        </span>
        <span className="font-body text-[10px] text-brand-text-muted bg-brand-surface-raised px-1.5 py-0.5 rounded flex-shrink-0">
          {typeLabel}
        </span>
      </div>

      <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        {/* Primary metric */}
        <div className="mb-3">
          <span className="font-display text-2xl font-700 text-brand-text tabular-nums">
            {animated}
          </span>
          <span className="font-body text-xs text-brand-text-muted ml-1.5">
            {primaryLabel}
          </span>
        </div>

        {/* Engagement bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--color-brand-border, rgba(128,128,128,0.15))' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${barWidth}%`,
              background: 'var(--color-brand-accent, #0d9488)',
            }}
          />
        </div>

        {/* Multi-event breakdown */}
        {events.length > 1 && (
          <div className="space-y-1.5 pt-1 border-t border-brand-border/50">
            {events.map((ev) => (
              <div key={ev.event_type} className="flex items-center justify-between">
                <span className="font-body text-[11px] text-brand-text-muted">{ev.metric_label}</span>
                <span className="font-body text-xs font-medium text-brand-text tabular-nums">{ev.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner />
        </div>
      )}
    </div>
  );
}
