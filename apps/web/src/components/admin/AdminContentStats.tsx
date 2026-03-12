interface ContentStats {
  block_types: { block_type: string; count: number }[];
  avg_links_per_page: number;
  avg_blocks_per_page: number;
  plan_distribution: { plan: string; count: number }[];
}

export function AdminContentStats({ stats }: { stats: ContentStats }) {
  const maxBlockType = stats.block_types[0]?.count ?? 1;
  const totalPlanUsers = stats.plan_distribution.reduce((s, p) => s + p.count, 0);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Content Distribution
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-lg bg-brand-surface-alt p-3">
          <p className="font-body text-[11px] text-brand-text-muted mb-1">Avg Links / Page</p>
          <p className="font-display text-lg font-700 text-brand-text">{stats.avg_links_per_page}</p>
        </div>
        <div className="rounded-lg bg-brand-surface-alt p-3">
          <p className="font-body text-[11px] text-brand-text-muted mb-1">Avg Blocks / Page</p>
          <p className="font-display text-lg font-700 text-brand-text">{stats.avg_blocks_per_page}</p>
        </div>
      </div>

      <h4 className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-3">
        Block Types
      </h4>
      <div className="space-y-2 mb-5">
        {stats.block_types.map((bt) => {
          const pct = Math.round((bt.count / maxBlockType) * 100);
          return (
            <div key={bt.block_type}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs font-medium text-brand-text truncate mr-3">{bt.block_type}</span>
                <span className="font-body text-xs text-brand-text-muted tabular-nums">{bt.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-brand-surface-alt overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'var(--color-brand-accent, #10b981)', opacity: 0.65 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="font-body text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-3">
        Plan Distribution
      </h4>
      <div className="flex gap-3">
        {stats.plan_distribution.map((p) => {
          const pct = totalPlanUsers > 0 ? Math.round((p.count / totalPlanUsers) * 100) : 0;
          return (
            <div key={p.plan} className="flex items-center gap-2">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                p.plan === 'pro' ? 'bg-brand-accent/15 text-brand-accent' : 'bg-brand-surface-alt text-brand-text-muted'
              }`}>
                {p.plan}
              </span>
              <span className="font-body text-xs text-brand-text tabular-nums">{p.count}</span>
              <span className="font-body text-[11px] text-brand-text-muted">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
