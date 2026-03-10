import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { PollData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

export function PollRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as PollData;
  const [voted, setVoted] = useState(false);
  const [pollData, setPollData] = useState(data);
  const [voting, setVoting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);

  // Check cookie on mount for vote persistence
  useEffect(() => {
    const cookie = getCookie(`poll_${block.id}`);
    if (cookie) setVoted(true);
  }, [block.id]);

  // Treat poll as closed when end_date has passed
  const isPastEndDate = pollData.end_date
    ? new Date(pollData.end_date).getTime() < Date.now()
    : false;
  const isClosed = pollData.closed || isPastEndDate;

  if (!pollData.question) return null;

  const totalVotes = pollData.options.reduce((sum, o) => sum + (o.votes || 0), 0);

  async function handleVote(optionId: string) {
    if (voted || isClosed || voting) return;
    setVoting(true);
    setSelectedId(optionId);
    try {
      const res = await fetch(`/api/public/poll/${block.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      });
      const json = await res.json() as { success: boolean; data?: PollData; error?: string };
      if (json.success && json.data) {
        setPollData(json.data);
        setVoted(true);
        if (pageId) trackEvent(pageId, 'poll_vote', { blockId: block.id });
      } else if (json.error === 'Already voted') {
        setVoted(true);
      }
    } catch {
      // silent
    } finally {
      setVoting(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: pollData.question });
      } else {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch {
      // User cancelled or clipboard failed — try clipboard fallback
      try {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      } catch {
        // silent
      }
    }
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-4 relative"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--page-text)' }}>
        {pollData.question}
      </h3>

      {/* Total vote count above options */}
      {totalVotes > 0 && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--page-text)', opacity: 0.45 }}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </p>
      )}

      <div className="space-y-2">
        {pollData.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = selectedId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voted || isClosed}
              className="w-full relative rounded-lg overflow-hidden text-left"
              style={{
                border: `1px solid ${isSelected && voted ? 'var(--page-accent)' : 'var(--page-surface-alt, rgba(128,128,128,0.2))'}`,
                opacity: voting ? 0.6 : 1,
                transition: 'opacity 150ms ease, border-color 300ms ease, transform 150ms ease',
                transform: voting && isSelected ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {voted && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'var(--page-accent)',
                    opacity: 0.15,
                    width: `${pct}%`,
                    transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className="text-sm break-words min-w-0" style={{ color: 'var(--page-text)' }}>{option.text}</span>
                {voted && (
                  <span
                    className="text-xs font-medium ml-2"
                    style={{
                      color: 'var(--page-text)',
                      opacity: 0.6,
                      animation: 'fadeIn 300ms ease forwards',
                    }}
                  >
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {isClosed && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
          {isPastEndDate && !pollData.closed ? 'Poll ended' : 'Poll closed'}
        </p>
      )}

      {/* Share results button — shown after voting or when closed */}
      {(voted || isClosed) && (
        <div className="mt-3 flex justify-end relative">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-opacity duration-150 hover:opacity-80"
            style={{ color: 'var(--page-text)', opacity: 0.55 }}
          >
            <Share2 className="w-3 h-3" />
            Share results
          </button>
          {shareToast && (
            <span
              className="absolute -top-7 right-0 px-2 py-0.5 rounded text-[11px] font-medium text-white"
              style={{ background: 'var(--page-accent)' }}
            >
              Link copied!
            </span>
          )}
        </div>
      )}
    </div>
  );
}
