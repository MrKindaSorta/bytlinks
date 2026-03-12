import type { FunnelData } from '../../hooks/useAdminAnalytics';

const stages: { key: keyof FunnelData; label: string }[] = [
  { key: 'signed_up', label: 'Signed Up' },
  { key: 'created_page', label: 'Created Page' },
  { key: 'published', label: 'Published' },
  { key: 'added_links', label: 'Added Links' },
  { key: 'added_blocks', label: 'Added Blocks' },
  { key: 'got_views', label: 'Got Views' },
  { key: 'got_clicks', label: 'Got Clicks' },
];

export function AdminActivationFunnel({ data }: { data: FunnelData }) {
  const max = Math.max(...stages.map((s) => data[s.key]), 1);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Activation Funnel
      </h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const value = data[stage.key];
          const pct = max > 0 ? (value / max) * 100 : 0;
          const prevValue = i > 0 ? data[stages[i - 1].key] : null;
          const conversionRate = prevValue && prevValue > 0
            ? Math.round((value / prevValue) * 100)
            : null;

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs text-brand-text">{stage.label}</span>
                <span className="font-body text-xs text-brand-text-muted">
                  {value.toLocaleString()}
                  {conversionRate !== null && (
                    <span className="ml-1.5 text-[10px] text-brand-text-muted/60">
                      ({conversionRate}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-5 rounded bg-brand-surface-alt overflow-hidden">
                <div
                  className="h-full rounded bg-brand-accent/80 transition-all duration-500"
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
