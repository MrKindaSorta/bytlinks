import { useState } from 'react';
import { Share2, Lock, Unlock } from 'lucide-react';
import type { ContentBlock, PollData } from '@bytlinks/shared';

interface ManagePollsProps {
  blocks: ContentBlock[];
}

function formatEndDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isPastDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

function PollCard({ block }: { block: ContentBlock }) {
  const [pollData, setPollData] = useState<PollData>(block.data as PollData);
  const [toggling, setToggling] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const isPastEndDate = isPastDate(pollData.end_date);
  const isClosed = pollData.closed || isPastEndDate;
  const totalVotes = pollData.options.reduce((sum, o) => sum + (o.votes || 0), 0);
  const endDate = formatEndDate(pollData.end_date);

  async function handleToggleClosed() {
    if (toggling) return;
    setToggling(true);
    const newClosed = !pollData.closed;
    try {
      const res = await fetch(`/api/blocks/${block.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: { ...pollData, closed: newClosed } }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setPollData((prev) => ({ ...prev, closed: newClosed }));
      }
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  }

  async function handleShare() {
    // Copy current page URL — works because polls are on user public pages
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    } catch {
      // silent
    }
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display text-sm font-bold text-brand-text flex-1 min-w-0">
          {pollData.question}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <span
            className={`inline-flex items-center font-body text-xs font-medium px-2 py-0.5 rounded-full
              ${isClosed
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
          >
            {isClosed ? 'Closed' : 'Open'}
          </span>
          {/* Toggle button — disabled if closed due to past end_date */}
          {!isPastEndDate && (
            <button
              onClick={handleToggleClosed}
              disabled={toggling}
              title={pollData.closed ? 'Reopen poll' : 'Close poll'}
              className="inline-flex items-center gap-1 font-body text-xs font-medium px-2 py-0.5 rounded-lg
                         bg-brand-surface-alt border border-brand-border text-brand-text-secondary
                         hover:text-brand-text disabled:opacity-50 transition-colors duration-fast"
            >
              {pollData.closed ? (
                <><Unlock className="w-3 h-3" /> Reopen</>
              ) : (
                <><Lock className="w-3 h-3" /> Close</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Meta: votes + end date */}
      <p className="font-body text-xs text-brand-text-muted mb-4">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {endDate && (
          <span className="ml-2">
            &middot; Ends {endDate}
            {isPastEndDate && ' (ended)'}
          </span>
        )}
      </p>

      {/* Options with CSS bar chart */}
      <div className="space-y-2 mb-4">
        {pollData.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          return (
            <div key={option.id}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-body text-xs text-brand-text">{option.text}</span>
                <span className="font-body text-xs font-medium text-brand-text-muted ml-2 shrink-0">
                  {pct}% ({option.votes})
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-brand-surface-alt">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: 'var(--color-brand-accent, #6366f1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Share button */}
      <div className="relative flex justify-end">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 font-body text-xs font-medium text-brand-text-secondary hover:text-brand-text transition-colors duration-fast"
        >
          <Share2 className="w-3 h-3" />
          Share results
        </button>
        {shareToast && (
          <span className="absolute -top-7 right-0 px-2 py-0.5 rounded font-body text-xs font-medium text-white bg-brand-accent">
            Link copied!
          </span>
        )}
      </div>
    </div>
  );
}

export function ManagePolls({ blocks }: ManagePollsProps) {
  const pollBlocks = blocks.filter((b) => b.block_type === 'poll');

  if (pollBlocks.length === 0) {
    return (
      <div className="max-w-xl">
        <p className="font-body text-sm text-brand-text-muted">
          Add a Poll block to manage it here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {pollBlocks.map((block) => (
        <PollCard key={block.id} block={block} />
      ))}
    </div>
  );
}
