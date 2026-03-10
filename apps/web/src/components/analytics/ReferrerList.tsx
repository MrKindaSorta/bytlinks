import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';

interface ReferrerData {
  source: string;
  count: number;
}

function AnimatedCount({ value, delay }: { value: number; delay: number }) {
  const key = useCountUpKey();
  const animated = useCountUp(value, key, 1200, delay);
  return <>{animated}</>;
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
        opacity: 0.7,
        transition: key > 0 ? 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
      }}
    />
  );
}

export function ReferrerList({ referrers }: { referrers: ReferrerData[] }) {
  const max = referrers[0]?.count ?? 1;
  const refreshing = useRefreshing();

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Traffic Sources
      </h3>

      <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        {referrers.length === 0 ? (
          <p className="font-body text-xs text-brand-text-muted">No referrer data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {referrers.map((ref, i) => {
              const pct = Math.round((ref.count / max) * 100);
              return (
                <div key={ref.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-xs font-medium text-brand-text truncate mr-3">
                      {ref.source}
                    </span>
                    <span className="font-body text-xs text-brand-text-muted tabular-nums">
                      <AnimatedCount value={ref.count} delay={i * 60} />
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-brand-surface-alt overflow-hidden">
                    <AnimatedBar pct={pct} />
                  </div>
                </div>
              );
            })}
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
