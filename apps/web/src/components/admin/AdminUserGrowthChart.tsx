import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface GrowthDay {
  day: string;
  count: number;
}

function formatDay(day: string): string {
  const d = new Date(day + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AdminUserGrowthChart({ data }: { data: GrowthDay[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">User Growth</h3>
        <p className="font-body text-xs text-brand-text-muted">No signup data yet.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: formatDay(d.day) }));

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        User Growth (90d)
      </h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-accent, #10b981)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-brand-accent, #10b981)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border, #e5e7eb)" vertical={false} />
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
              dataKey="count"
              stroke="var(--color-brand-accent, #10b981)"
              strokeWidth={2}
              fill="url(#growthGrad)"
              name="Signups"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
