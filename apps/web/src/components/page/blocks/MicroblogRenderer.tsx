import { useState } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { MicroblogData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

const INITIAL_SHOW = 5;

export function MicroblogRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as MicroblogData;
  const [showAll, setShowAll] = useState(false);

  if (!data.posts?.length) return null;

  const visiblePosts = showAll ? data.posts : data.posts.slice(0, INITIAL_SHOW);
  const hasMore = data.posts.length > INITIAL_SHOW;

  return (
    <div className="scroll-reveal my-6">
      {block.title && (
        <h3
          className="text-base font-bold tracking-tight mb-3"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      <div className="space-y-0">
        {visiblePosts.map((post, i) => (
          <div
            key={post.id}
            className="px-4 py-3"
            style={{
              borderBottom: i < visiblePosts.length - 1 ? '1px solid var(--page-border, rgba(128,128,128,0.1))' : 'none',
              background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
              borderRadius: i === 0 ? '12px 12px 0 0' : i === visiblePosts.length - 1 && !(hasMore && !showAll) ? '0 0 12px 12px' : '0',
            }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--page-text)' }}>
              {post.text}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
              {formatTimeAgo(post.created_at)}
            </p>
          </div>
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => {
            setShowAll(true);
            if (pageId) trackEvent(pageId, 'microblog_expand', { blockId: block.id });
          }}
          className="w-full py-2.5 text-xs font-medium rounded-b-xl transition-colors duration-200"
          style={{
            background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
            color: 'var(--page-accent)',
            borderTop: '1px solid var(--page-border, rgba(128,128,128,0.1))',
          }}
        >
          Show {data.posts.length - INITIAL_SHOW} more posts
        </button>
      )}
    </div>
  );
}
