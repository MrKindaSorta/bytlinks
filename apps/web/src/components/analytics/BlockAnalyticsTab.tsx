import { useState, useMemo } from 'react';
import { useRefreshing } from './AnalyticsContext';
import { BlockSummaryCards } from './BlockSummaryCards';
import { BlockFilterBar } from './BlockFilterBar';
import { BlockCard } from './BlockCard';
import { PollCard } from './PollCard';
import { NewsletterCard } from './NewsletterCard';
import { BLOCK_CATEGORIES } from './blockConstants';
import type { BlockCategory } from './blockConstants';
import type { AnalyticsData, BlockPerformanceData } from '../../hooks/useAnalytics';

interface Props {
  data: AnalyticsData;
}

interface GroupedBlock {
  blockId: string;
  blockType: string;
  title: string | null;
  events: BlockPerformanceData[];
  totalCount: number;
}

export function BlockAnalyticsTab({ data }: Props) {
  const [category, setCategory] = useState<BlockCategory>('all');
  const refreshing = useRefreshing();

  // Group events by block_id
  const grouped = useMemo(() => {
    const map = new Map<string, GroupedBlock>();
    for (const block of data.blockPerformance) {
      const existing = map.get(block.block_id);
      if (existing) {
        existing.events.push(block);
        existing.totalCount += block.count;
      } else {
        map.set(block.block_id, {
          blockId: block.block_id,
          blockType: block.block_type,
          title: block.title,
          events: [block],
          totalCount: block.count,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [data.blockPerformance]);

  // Filter by category
  const filtered = useMemo(() => {
    if (category === 'all') return grouped;
    const types = BLOCK_CATEGORIES[category];
    return grouped.filter((g) => types.includes(g.blockType));
  }, [grouped, category]);

  const maxCount = useMemo(
    () => Math.max(...filtered.map((g) => g.totalCount), 1),
    [filtered],
  );

  // Separate polls, newsletters, and generic blocks
  const polls = filtered.filter((g) => g.blockType === 'poll');
  const newsletters = filtered.filter((g) => g.blockType === 'newsletter');
  const generic = filtered.filter((g) => g.blockType !== 'poll' && g.blockType !== 'newsletter');

  if (data.blockPerformance.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-10 text-center">
        <p className="font-display text-lg font-700 text-brand-text mb-2">
          No block interactions yet
        </p>
        <p className="font-body text-sm text-brand-text-muted">
          Add content blocks to your page to start tracking engagement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {data.blockSummary && (
        <BlockSummaryCards
          summary={data.blockSummary}
          totalViews={data.overview?.total_views ?? 0}
        />
      )}

      {/* Filter bar */}
      <BlockFilterBar active={category} onChange={setCategory} />

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-8 text-center">
          <p className="font-body text-sm text-brand-text-muted">
            No blocks in this category have interactions yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Poll cards */}
          {polls.map((g) => (
            <PollCard
              key={g.blockId}
              poll={g.events[0]}
              refreshing={refreshing}
            />
          ))}

          {/* Newsletter cards */}
          {newsletters.map((g) => (
            <NewsletterCard
              key={g.blockId}
              newsletter={g.events[0]}
              refreshing={refreshing}
            />
          ))}

          {/* Generic block cards */}
          {generic.map((g, i) => (
            <BlockCard
              key={g.blockId}
              blockId={g.blockId}
              blockType={g.blockType}
              title={g.title}
              events={g.events}
              maxCount={maxCount}
              delay={i * 80}
            />
          ))}
        </div>
      )}
    </div>
  );
}
