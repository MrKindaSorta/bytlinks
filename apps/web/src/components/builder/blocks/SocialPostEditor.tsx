import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { SocialPostData } from '@bytlinks/shared';

const PLATFORMS = ['twitter', 'instagram', 'tiktok'] as const;

export function SocialPostEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as SocialPostData;
  const [platform, setPlatform] = useState(data.platform || 'twitter');
  const [postUrl, setPostUrl] = useState(data.post_url || '');
  const [fallbackText, setFallbackText] = useState(data.fallback_text || '');

  function save(updates: Partial<SocialPostData>) {
    editBlock(block.id, { data: { platform, post_url: postUrl, fallback_text: fallbackText, ...updates } });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => { setPlatform(p); save({ platform: p }); }}
            className={`px-2.5 py-1 rounded-md font-body text-xs font-medium capitalize transition-colors duration-150
              ${platform === p
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        type="url"
        value={postUrl}
        onChange={(e) => setPostUrl(e.target.value)}
        onBlur={() => save({ post_url: postUrl })}
        placeholder="Paste post URL..."
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="text"
        value={fallbackText}
        onChange={(e) => setFallbackText(e.target.value)}
        onBlur={() => save({ fallback_text: fallbackText })}
        placeholder="Fallback text (optional)"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
    </div>
  );
}
