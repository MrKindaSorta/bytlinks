import { useState } from 'react';
import { Trophy, ExternalLink } from 'lucide-react';
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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
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
        {visiblePosts.map((post, i) => {
          const isFirst = i === 0;
          const isLast = i === visiblePosts.length - 1 && !(hasMore && !showAll);
          const isAnnouncement = post.post_type === 'announcement';
          const isMilestone = post.post_type === 'milestone';

          return (
            <div
              key={post.id}
              className="px-4 py-3"
              style={{
                borderBottom: i < visiblePosts.length - 1 ? '1px solid var(--page-border, rgba(128,128,128,0.1))' : 'none',
                background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
                borderRadius: isFirst && isLast ? '12px' : isFirst ? '12px 12px 0 0' : isLast ? '0 0 12px 12px' : '0',
                borderLeft: isAnnouncement ? '3px solid var(--page-accent, #0d9488)' : 'none',
              }}
            >
              {isMilestone && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--page-accent)' }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--page-accent)' }}>
                    Milestone
                  </span>
                </div>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--page-text)' }}>
                {post.text}
              </p>

              {post.image_r2_key && (
                <img
                  src={`/api/public/file/${post.image_r2_key}`}
                  alt=""
                  className="mt-2.5 w-full rounded-lg object-cover"
                  style={{ maxHeight: '280px' }}
                  loading="lazy"
                />
              )}

              {post.link_url && (
                <a
                  href={post.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-opacity duration-150 hover:opacity-80"
                  style={{
                    background: 'var(--page-bg, rgba(128,128,128,0.03))',
                    border: '1px solid var(--page-border, rgba(128,128,128,0.12))',
                  }}
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${getDomain(post.link_url)}&sz=32`}
                    alt=""
                    className="w-4 h-4 rounded-sm shrink-0"
                  />
                  <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--page-text)' }}>
                    {post.link_title || getDomain(post.link_url)}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0" style={{ color: 'var(--page-text)', opacity: 0.4 }} />
                </a>
              )}

              <p className="text-[11px] mt-2" style={{ color: 'var(--page-text)', opacity: 0.4 }}>
                {formatTimeAgo(post.created_at)}
              </p>
            </div>
          );
        })}
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
          Show {data.posts.length - INITIAL_SHOW} more updates
        </button>
      )}
    </div>
  );
}
