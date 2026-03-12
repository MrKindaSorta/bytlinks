import { useState } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { useAdminUsers } from '../../hooks/useAdminAnalytics';

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SortButton({ column, current, order, onChange }: {
  column: string;
  current: string;
  order: string;
  onChange: (col: string) => void;
}) {
  const active = current === column;
  return (
    <button onClick={() => onChange(column)} className="inline-flex items-center gap-0.5">
      {active && order === 'asc' ? (
        <ChevronUp className="w-3 h-3 text-brand-accent" />
      ) : active && order === 'desc' ? (
        <ChevronDown className="w-3 h-3 text-brand-accent" />
      ) : (
        <ChevronDown className="w-3 h-3 text-brand-text-muted opacity-30" />
      )}
    </button>
  );
}

export function AdminUserTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');

  const { users, pagination, loading } = useAdminUsers(page, search, sort, order);

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h3 className="font-display text-sm font-700 tracking-tight text-brand-text">
          Users ({pagination.total})
        </h3>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search email or username..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/40 w-56"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-brand-accent text-white font-body text-xs font-medium hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-brand-border">
              {[
                { key: 'username', label: 'Username' },
                { key: 'email', label: 'Email' },
                { key: 'created_at', label: 'Joined' },
              ].map((col) => (
                <th key={col.key} className="pb-2 pr-4 font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortButton column={col.key} current={sort} order={order} onChange={handleSort} />
                  </span>
                </th>
              ))}
              <th className="pb-2 pr-4 font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide">Plan</th>
              <th className="pb-2 pr-4 font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide text-right">Links</th>
              <th className="pb-2 pr-4 font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide text-right">Blocks</th>
              <th className="pb-2 font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide text-right">
                <span className="inline-flex items-center gap-1">
                  Views
                  <SortButton column="view_count" current={sort} order={order} onChange={handleSort} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center font-body text-xs text-brand-text-muted">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-brand-border/50 last:border-0">
                  <td className="py-2.5 pr-4 font-body text-xs text-brand-text">
                    <span className="inline-flex items-center gap-1">
                      {u.username || '—'}
                      {u.verified === 1 && <BadgeCheck className="w-3.5 h-3.5 text-brand-accent" />}
                      {u.is_published === 0 && <span className="text-[10px] text-brand-text-muted">(draft)</span>}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-body text-xs text-brand-text-muted truncate max-w-[200px]">{u.email}</td>
                  <td className="py-2.5 pr-4 font-body text-xs text-brand-text-muted tabular-nums">{formatDate(u.created_at)}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                      u.plan === 'pro' ? 'bg-brand-accent/15 text-brand-accent' : 'bg-brand-surface-alt text-brand-text-muted'
                    }`}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-body text-xs text-brand-text-muted tabular-nums text-right">{u.link_count}</td>
                  <td className="py-2.5 pr-4 font-body text-xs text-brand-text-muted tabular-nums text-right">{u.block_count}</td>
                  <td className="py-2.5 font-body text-xs text-brand-text-muted tabular-nums text-right">{u.view_count.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-border">
          <span className="font-body text-xs text-brand-text-muted">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-surface-alt disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-brand-text-muted" />
            </button>
            <button
              onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={page === pagination.pages}
              className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-surface-alt disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5 text-brand-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
