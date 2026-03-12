interface ReferrerItem {
  source: string;
  count: number;
}

export function AdminReferrers({ referrers }: { referrers: ReferrerItem[] }) {
  const max = referrers[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Top Referrers (30d)
      </h3>

      {referrers.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted">No referrer data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {referrers.map((r) => {
            const pct = Math.round((r.count / max) * 100);
            return (
              <div key={r.source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs font-medium text-brand-text truncate mr-3">{r.source}</span>
                  <span className="font-body text-xs text-brand-text-muted tabular-nums">{r.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-brand-surface-alt overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: 'var(--color-brand-accent, #10b981)', opacity: 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
