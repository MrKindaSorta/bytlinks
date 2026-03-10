import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ContentBlock, NewsletterData } from '@bytlinks/shared';

interface Subscriber {
  email: string;
  created_at: string | number;
}

interface SignupByDay {
  day: string;
  count: number;
}

interface ManageNewsletterProps {
  blocks: ContentBlock[];
}

const PAGE_SIZE = 25;

function formatDate(val: string | number): string {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider || provider === 'none') {
    return (
      <span className="inline-flex items-center gap-1 font-body text-xs px-2 py-0.5 rounded-full bg-brand-surface-alt text-brand-text-muted border border-brand-border">
        No sync
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-body text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
      <CheckCircle className="w-3 h-3" />
      Synced: {provider === 'mailchimp' ? 'Mailchimp' : provider === 'convertkit' ? 'ConvertKit' : provider}
    </span>
  );
}

function BlockPicker({
  blocks,
  selected,
  onSelect,
}: {
  blocks: ContentBlock[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (blocks.length <= 1) return null;
  return (
    <div className="mb-6">
      <label className="font-body text-xs text-brand-text-muted mb-1 block">Newsletter block</label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="font-body text-sm bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        {blocks.map((b) => {
          const d = b.data as NewsletterData;
          return (
            <option key={b.id} value={b.id}>
              {b.title || d.heading || 'Newsletter Block'}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function ManageNewsletter({ blocks }: ManageNewsletterProps) {
  const newsletterBlocks = blocks.filter((b) => b.block_type === 'newsletter');
  const [selectedBlockId, setSelectedBlockId] = useState<string>(newsletterBlocks[0]?.id ?? '');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [page, setPage] = useState(1);
  const [trendData, setTrendData] = useState<SignupByDay[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  useEffect(() => {
    if (!selectedBlockId) return;
    setPage(1);
    setLoadingSubs(true);
    fetch(`/api/analytics/newsletter-subscribers?block_id=${selectedBlockId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSubscribers(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingSubs(false));
  }, [selectedBlockId]);

  useEffect(() => {
    if (!selectedBlockId) return;
    setLoadingTrend(true);
    fetch(`/api/analytics/newsletter-signups-by-day?block_id=${selectedBlockId}&days=30`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTrendData(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingTrend(false));
  }, [selectedBlockId]);

  function handleExportCsv() {
    if (subscribers.length === 0) return;
    const header = 'Email,Date';
    const rows = subscribers.map((s) => `${s.email},${formatDate(s.created_at)}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (newsletterBlocks.length === 0) {
    return (
      <div className="max-w-xl">
        <p className="font-body text-sm text-brand-text-muted">
          Add a Newsletter block to manage it here.
        </p>
      </div>
    );
  }

  const selectedBlock = newsletterBlocks.find((b) => b.id === selectedBlockId) ?? newsletterBlocks[0];
  const blockData = selectedBlock?.data as NewsletterData;

  const totalPages = Math.max(1, Math.ceil(subscribers.length / PAGE_SIZE));
  const pagedSubs = subscribers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-2xl space-y-8">
      <BlockPicker
        blocks={newsletterBlocks}
        selected={selectedBlockId || newsletterBlocks[0]?.id}
        onSelect={(id) => setSelectedBlockId(id)}
      />

      {/* Overview card */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="rounded-xl bg-brand-surface-alt border border-brand-border px-5 py-4 min-w-[140px]">
          <p className="font-body text-xs text-brand-text-muted mb-1">Total subscribers</p>
          <p className="font-display text-3xl font-bold text-brand-text">
            {loadingSubs ? '—' : subscribers.length}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1.5 py-1">
          <p className="font-body text-xs text-brand-text-muted">Provider sync</p>
          <ProviderBadge provider={blockData?.sync_provider} />
        </div>
      </div>

      {/* Signup trend chart */}
      <section>
        <h2 className="font-display text-base font-bold text-brand-text mb-4">Signups — last 30 days</h2>
        {loadingTrend ? (
          <div className="flex items-center gap-2 text-brand-text-muted font-body text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading chart...
          </div>
        ) : trendData.length === 0 ? (
          <p className="font-body text-sm text-brand-text-muted">No signups in the last 30 days.</p>
        ) : (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'var(--color-brand-text-muted, #9ca3af)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-brand-text-muted, #9ca3af)' }}
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
                  }}
                  labelStyle={{ color: 'var(--color-brand-text, #111)' }}
                  itemStyle={{ color: 'var(--color-brand-accent, #6366f1)' }}
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                />
                <Bar dataKey="count" fill="var(--color-brand-accent, #6366f1)" radius={[3, 3, 0, 0]} name="Signups" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Subscriber list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-bold text-brand-text">Subscribers</h2>
          {subscribers.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 font-body text-xs font-medium px-3 py-1.5 rounded-lg
                         bg-brand-surface-alt border border-brand-border text-brand-text-secondary
                         hover:text-brand-text transition-colors duration-fast"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
          )}
        </div>

        {loadingSubs ? (
          <div className="flex items-center gap-2 text-brand-text-muted font-body text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading subscribers...
          </div>
        ) : subscribers.length === 0 ? (
          <p className="font-body text-sm text-brand-text-muted">No subscribers yet.</p>
        ) : (
          <>
            <div className="rounded-xl border border-brand-border overflow-hidden">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="bg-brand-surface-alt border-b border-brand-border">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSubs.map((sub, i) => (
                    <tr
                      key={sub.email + i}
                      className="border-b border-brand-border last:border-0 hover:bg-brand-surface-alt transition-colors duration-fast"
                    >
                      <td className="px-4 py-2.5 text-brand-text">{sub.email}</td>
                      <td className="px-4 py-2.5 text-brand-text-muted text-xs">{formatDate(sub.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <p className="font-body text-xs text-brand-text-muted">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, subscribers.length)} of {subscribers.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded text-brand-text-secondary hover:text-brand-text disabled:opacity-30 transition-colors duration-fast"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-body text-xs text-brand-text-muted px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded text-brand-text-secondary hover:text-brand-text disabled:opacity-30 transition-colors duration-fast"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
