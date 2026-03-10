import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';

interface RealtimeData {
  active_views: number;
  active_clicks: number;
}

export function RealtimePulse({ data }: { data: RealtimeData }) {
  const hasActivity = data.active_views > 0 || data.active_clicks > 0;
  const key = useCountUpKey();
  const refreshing = useRefreshing();
  const views = useCountUp(data.active_views, key, 800);
  const clicks = useCountUp(data.active_clicks, key, 800, 100);

  return (
    <div className="relative flex items-center gap-4 rounded-xl border border-brand-border bg-brand-surface px-5 py-3 overflow-hidden">
      <div
        className="flex items-center gap-4"
        style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              hasActivity ? 'bg-emerald-500 animate-pulse' : 'bg-brand-text-muted/30'
            }`}
          />
          <span className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide">
            Last 30 min
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body text-xs text-brand-text">
            <span className="font-display font-700 text-sm tabular-nums">{views}</span>{' '}
            {data.active_views === 1 ? 'view' : 'views'}
          </span>
          <span className="font-body text-xs text-brand-text">
            <span className="font-display font-700 text-sm tabular-nums">{clicks}</span>{' '}
            {data.active_clicks === 1 ? 'click' : 'clicks'}
          </span>
        </div>
      </div>
      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner className="" />
        </div>
      )}
    </div>
  );
}
