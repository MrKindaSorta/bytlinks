import { useState, useEffect } from 'react';
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

  // Check cookie on mount for vote persistence
  useEffect(() => {
    const cookie = getCookie(`poll_${block.id}`);
    if (cookie) setVoted(true);
  }, [block.id]);

  if (!pollData.question) return null;

  const totalVotes = pollData.options.reduce((sum, o) => sum + (o.votes || 0), 0);

  async function handleVote(optionId: string) {
    if (voted || pollData.closed || voting) return;
    setVoting(true);
    setSelectedId(optionId);
    try {
      const res = await fetch(`/api/public/poll/${block.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      });
      const json = await res.json();
      if (json.success) {
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

  return (
    <div
      className="scroll-reveal my-6 rounded-xl px-5 py-4"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--page-text)' }}>
        {pollData.question}
      </h3>
      <div className="space-y-2">
        {pollData.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = selectedId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voted || pollData.closed}
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
      <div
        style={{
          maxHeight: voted ? '40px' : '0px',
          opacity: voted ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 300ms ease, opacity 300ms ease',
        }}
      >
        <p className="text-[11px] mt-2" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </p>
      </div>
      {pollData.closed && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
          Poll closed
        </p>
      )}
    </div>
  );
}
