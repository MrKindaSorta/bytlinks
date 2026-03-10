import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import type { ContentBlock, EventData } from '@bytlinks/shared';

interface Rsvp {
  id: string;
  name: string | null;
  email: string;
  created_at: string | number;
}

interface RsvpResponse {
  success: boolean;
  data?: Rsvp[];
  total?: number;
  page?: number;
  total_pages?: number;
  error?: string;
}

interface ManageEventsProps {
  blocks: ContentBlock[];
}

const PAGE_SIZE = 25;

function formatDate(val: string | number | undefined | null): string {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function EventCard({ block }: { block: ContentBlock }) {
  const data = block.data as EventData;
  const hasFullRsvp = data.rsvp_enabled && (data.rsvp_mode === 'full' || data.rsvp_mode === 'both');

  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!hasFullRsvp) return;
    setLoading(true);
    fetch(`/api/event-rsvps/${block.id}?page=${page}&limit=${PAGE_SIZE}`, { credentials: 'include' })
      .then((r) => r.json() as Promise<RsvpResponse>)
      .then((json) => {
        if (json.success) {
          setRsvps(json.data ?? []);
          setTotal(json.total ?? 0);
          setTotalPages(json.total_pages ?? 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [block.id, hasFullRsvp, page]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/event-rsvps/${block.id}/export`, { credentials: 'include' });
      if (!res.ok) {
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rsvps-${block.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-display text-sm font-bold text-brand-text flex-1 min-w-0">
          {data.event_name}
        </h3>
        {data.interested_count !== undefined && data.interested_count > 0 && (
          <span className="inline-flex items-center gap-1 font-body text-xs text-brand-text-muted shrink-0">
            <Users className="w-3 h-3" />
            {data.interested_count} interested
          </span>
        )}
      </div>
      <p className="font-body text-xs text-brand-text-muted mb-4">
        {formatEventDate(data.event_date)}
        {data.venue && <span className="ml-2">&middot; {data.venue}</span>}
      </p>

      {/* RSVP list */}
      {hasFullRsvp && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-body text-xs font-semibold text-brand-text-muted uppercase tracking-wide">
              RSVPs {total > 0 && `(${total})`}
            </h4>
            {total > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 font-body text-xs font-medium px-2.5 py-1 rounded-lg
                           bg-brand-surface-alt border border-brand-border text-brand-text-secondary
                           hover:text-brand-text disabled:opacity-50 transition-colors duration-fast"
              >
                <Download className="w-3 h-3" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-brand-text-muted font-body text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading RSVPs...
            </div>
          ) : rsvps.length === 0 ? (
            <p className="font-body text-xs text-brand-text-muted">No RSVPs yet.</p>
          ) : (
            <>
              <div className="rounded-xl border border-brand-border overflow-hidden">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="bg-brand-surface-alt border-b border-brand-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rsvps.map((rsvp) => (
                      <tr
                        key={rsvp.id}
                        className="border-b border-brand-border last:border-0 hover:bg-brand-surface-alt transition-colors duration-fast"
                      >
                        <td className="px-4 py-2.5 text-brand-text">{rsvp.name || '—'}</td>
                        <td className="px-4 py-2.5 text-brand-text">{rsvp.email}</td>
                        <td className="px-4 py-2.5 text-brand-text-muted text-xs">{formatDate(rsvp.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="font-body text-xs text-brand-text-muted">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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
        </div>
      )}

      {!hasFullRsvp && data.rsvp_enabled && (
        <p className="font-body text-xs text-brand-text-muted">
          RSVP mode is set to &ldquo;Interested&rdquo; — no full RSVP form data to display.
        </p>
      )}

      {!data.rsvp_enabled && (
        <p className="font-body text-xs text-brand-text-muted">
          RSVPs are disabled for this event.
        </p>
      )}
    </div>
  );
}

export function ManageEvents({ blocks }: ManageEventsProps) {
  const eventBlocks = blocks.filter((b) => b.block_type === 'event');

  if (eventBlocks.length === 0) {
    return (
      <div className="max-w-xl">
        <p className="font-body text-sm text-brand-text-muted">
          Add an Event block to manage it here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {eventBlocks.map((block) => (
        <EventCard key={block.id} block={block} />
      ))}
    </div>
  );
}
