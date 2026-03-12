import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface DevicesData {
  device_types: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  operating_systems: { name: string; count: number }[];
}

const DEVICE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

function BreakdownBar({ items, label }: { items: { name: string; count: number }[]; label: string }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (total === 0) return null;

  return (
    <div>
      <h4 className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-3">{label}</h4>
      <div className="space-y-2">
        {items.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="font-body text-xs text-brand-text w-16 capitalize truncate">{item.name}</span>
              <div className="flex-1 h-2 rounded-full bg-brand-surface-alt overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'var(--color-brand-accent, #10b981)', opacity: 0.65 }}
                />
              </div>
              <span className="font-body text-xs text-brand-text-muted tabular-nums w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDevices({ devices }: { devices: DevicesData }) {
  const total = devices.device_types.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-5">
        Audience (30d)
      </h3>

      {total > 0 && (
        <div className="flex gap-6 mb-6">
          {devices.device_types.map((d) => {
            const Icon = DEVICE_ICONS[d.name] ?? Monitor;
            const pct = Math.round((d.count / total) * 100);
            return (
              <div key={d.name} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-brand-text-muted" />
                <span className="font-body text-xs text-brand-text capitalize">{d.name}</span>
                <span className="font-display text-sm font-700 text-brand-text tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <BreakdownBar items={devices.browsers} label="Browser" />
        <BreakdownBar items={devices.operating_systems} label="Operating System" />
      </div>
    </div>
  );
}
