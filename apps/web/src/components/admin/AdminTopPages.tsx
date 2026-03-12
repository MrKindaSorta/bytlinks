interface TopPage {
  username: string;
  display_name: string | null;
  email: string;
  views: number;
}

export function AdminTopPages({ pages }: { pages: TopPage[] }) {
  const max = pages[0]?.views ?? 1;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Top Pages (30d)
      </h3>

      {pages.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted">No page view data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {pages.map((p) => {
            const pct = Math.round((p.views / max) * 100);
            return (
              <div key={p.username}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs font-medium text-brand-text truncate mr-3">
                    {p.display_name || p.username}
                    <span className="text-brand-text-muted ml-1">/{p.username}</span>
                  </span>
                  <span className="font-body text-xs text-brand-text-muted tabular-nums">
                    {p.views.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-brand-surface-alt overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: 'var(--color-brand-accent, #10b981)',
                      opacity: 0.65,
                    }}
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
