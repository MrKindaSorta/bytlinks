import { Eye, MousePointerClick, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';

interface OverviewData {
  total_views: number;
  total_clicks: number;
  views_trend: number;
  clicks_trend: number;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-brand-text-muted">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }

  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        isUp ? 'text-emerald-500' : 'text-rose-500'
      }`}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{value}%
    </span>
  );
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const key = useCountUpKey();
  const animated = useCountUp(value, key, 1400, delay);
  return <>{animated.toLocaleString()}</>;
}

function CtrNumber({ raw, delay }: { raw: number; delay: number }) {
  const key = useCountUpKey();
  const animated = useCountUp(raw, key, 1400, delay);
  const formatted = (animated / 10).toFixed(1);
  return <>{formatted}%</>;
}

export function StatCards({ overview }: { overview: OverviewData }) {
  const refreshing = useRefreshing();
  const ctr = overview.total_views > 0
    ? Math.round((overview.total_clicks / overview.total_views) * 1000) / 10
    : 0;
  const ctrRaw = Math.round(ctr * 10);

  const cards = [
    { label: 'Total Views', rawValue: overview.total_views, isCtr: false, trend: overview.views_trend, icon: Eye, delay: 0 },
    { label: 'Total Clicks', rawValue: overview.total_clicks, isCtr: false, trend: overview.clicks_trend, icon: MousePointerClick, delay: 100 },
    { label: 'Click Rate', rawValue: ctrRaw, isCtr: true, trend: null as number | null, icon: TrendingUp, delay: 200 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide">
                {card.label}
              </span>
              <Icon className="w-4 h-4 text-brand-text-muted" />
            </div>

            {/* Content — fades out during refresh */}
            <div
              style={{
                opacity: refreshing ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              <p className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
                {card.isCtr ? (
                  <CtrNumber raw={ctrRaw} delay={card.delay} />
                ) : (
                  <AnimatedNumber value={card.rawValue} delay={card.delay} />
                )}
              </p>
              {card.trend !== null && (
                <div className="flex items-center gap-1">
                  <TrendBadge value={card.trend} />
                  <span className="text-[11px] text-brand-text-muted">vs last week</span>
                </div>
              )}
            </div>

            {/* Spinner overlay */}
            {refreshing && (
              <div className="absolute inset-0 flex items-center justify-center pt-6">
                <TileSpinner className="" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
