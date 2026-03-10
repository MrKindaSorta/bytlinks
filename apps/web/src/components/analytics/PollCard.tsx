import { Vote, Trophy } from 'lucide-react';
import { TileSpinner } from './TileSpinner';
import type { BlockPerformanceData } from '../../hooks/useAnalytics';

interface Props {
  poll: BlockPerformanceData;
  refreshing: boolean;
}

export function PollCard({ poll, refreshing }: Props) {
  if (!poll.poll) return null;

  const { question, options, closed, total_votes } = poll.poll;
  const maxVotes = Math.max(...options.map((o) => o.votes), 1);
  const winner = options.reduce((a, b) => (b.votes > a.votes ? b : a), options[0]);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-brand-text-muted" />
          <h3 className="font-display text-sm font-700 tracking-tight text-brand-text">
            Poll: {poll.title || question}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {closed && (
            <span className="font-body text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent">
              Closed
            </span>
          )}
          <span className="font-body text-xs text-brand-text-muted tabular-nums">
            {total_votes} total votes
          </span>
        </div>
      </div>

      <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        <div className="space-y-2.5">
          {options.map((option, i) => {
            const pct = total_votes > 0 ? (option.votes / total_votes) * 100 : 0;
            const isWinner = option === winner && total_votes > 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {isWinner && <Trophy className="w-3 h-3 text-brand-accent" />}
                    <span className={`font-body text-xs ${isWinner ? 'font-bold text-brand-text' : 'text-brand-text'}`}>
                      {option.text}
                    </span>
                  </div>
                  <span className="font-body text-xs text-brand-text-muted tabular-nums">
                    {option.votes} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-brand-border, rgba(128,128,128,0.15))' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(option.votes / maxVotes) * 100}%`,
                      background: isWinner ? 'var(--color-brand-accent, #0d9488)' : 'var(--color-brand-text-muted, #94a3b8)',
                      opacity: isWinner ? 1 : 0.4,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner />
        </div>
      )}
    </div>
  );
}
