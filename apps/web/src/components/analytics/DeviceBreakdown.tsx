import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';

interface DeviceData {
  device_types: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  operating_systems: { name: string; count: number }[];
}

const DEVICE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

function AnimatedPct({ value, delay }: { value: number; delay: number }) {
  const key = useCountUpKey();
  const animated = useCountUp(value, key, 1200, delay);
  return <>{animated}%</>;
}

function AnimatedBar({ pct }: { pct: number }) {
  const key = useCountUpKey();
  const width = key === 0 ? 0 : pct;

  return (
    <div
      className="h-full rounded-full"
      style={{
        width: `${width}%`,
        background: 'var(--color-brand-accent, #10b981)',
        opacity: 0.65,
        transition: key > 0 ? 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
      }}
    />
  );
}

function BreakdownBar({ items, label, baseDelay }: { items: { name: string; count: number }[]; label: string; baseDelay: number }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (total === 0) return null;

  return (
    <div>
      <h4 className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-3">
        {label}
      </h4>
      <div className="space-y-2">
        {items.map((item, i) => {
          const pct = Math.round((item.count / total) * 100);
          const delay = baseDelay + i * 60;
          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="font-body text-xs text-brand-text w-16 capitalize truncate">
                {item.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-brand-surface-alt overflow-hidden">
                <AnimatedBar pct={pct} />
              </div>
              <span className="font-body text-xs text-brand-text-muted tabular-nums w-10 text-right">
                <AnimatedPct value={pct} delay={delay} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DeviceBreakdown({ devices }: { devices: DeviceData | null }) {
  if (!devices) return null;

  const refreshing = useRefreshing();
  const { device_types, browsers, operating_systems } = devices;
  const total = device_types.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-5">
        Audience
      </h3>

      <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        {total > 0 && (
          <div className="flex gap-6 mb-6">
            {device_types.map((d, i) => {
              const Icon = DEVICE_ICONS[d.name] ?? Monitor;
              const pct = Math.round((d.count / total) * 100);
              return (
                <div key={d.name} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-brand-text-muted" />
                  <span className="font-body text-xs text-brand-text capitalize">{d.name}</span>
                  <span className="font-display text-sm font-700 text-brand-text tabular-nums">
                    <AnimatedPct value={pct} delay={i * 80} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BreakdownBar items={browsers} label="Browser" baseDelay={150} />
          <BreakdownBar items={operating_systems} label="Operating System" baseDelay={300} />
        </div>
      </div>

      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner />
        </div>
      )}
    </div>
  );
}
