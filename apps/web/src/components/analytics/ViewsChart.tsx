import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';

interface DailyData {
  day: string;
  views: number;
  clicks: number;
}

function formatDay(day: string): string {
  const d = new Date(day + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ViewsChart({ daily }: { daily: DailyData[] }) {
  if (daily.length === 0) return null;

  const refreshing = useRefreshing();
  const chartData = daily.map((d) => ({
    ...d,
    label: formatDay(d.day),
  }));

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Views & Clicks
      </h3>

      <div
        className="h-[220px]"
        style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-accent, #10b981)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-brand-accent, #10b981)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-text-muted, #6b7280)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-brand-text-muted, #6b7280)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-brand-border, #e5e7eb)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-brand-text-muted, #9ca3af)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-brand-text-muted, #9ca3af)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-brand-surface, #fff)',
                border: '1px solid var(--color-brand-border, #e5e7eb)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
              }}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="var(--color-brand-accent, #10b981)"
              strokeWidth={2}
              fill="url(#viewsGrad)"
              name="Views"
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="var(--color-brand-text-muted, #6b7280)"
              strokeWidth={1.5}
              fill="url(#clicksGrad)"
              name="Clicks"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner />
        </div>
      )}
    </div>
  );
}
