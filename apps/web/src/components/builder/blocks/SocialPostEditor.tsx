import { useState, useCallback } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { SocialPostData } from '@bytlinks/shared';

const PLATFORMS = [
  { key: 'twitter', label: 'X / Twitter', match: /twitter\.com|x\.com/ },
  { key: 'tiktok', label: 'TikTok', match: /tiktok\.com/ },
  { key: 'bluesky', label: 'Bluesky', match: /bsky\.app/ },
  { key: 'instagram', label: 'Instagram', match: /instagram\.com/, note: 'May show as link card' },
] as const;

function detectPlatform(url: string): string {
  for (const p of PLATFORMS) {
    if (p.match.test(url)) return p.key;
  }
  return '';
}

export function SocialPostEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as SocialPostData;
  const [postUrl, setPostUrl] = useState(data.post_url || '');
  const [platform, setPlatform] = useState(data.platform || '');
  const [fallbackText, setFallbackText] = useState(data.fallback_text || '');

  function save(updates: Partial<SocialPostData>) {
    editBlock(block.id, { data: { platform, post_url: postUrl, fallback_text: fallbackText, ...updates } });
  }

  const handleUrlChange = useCallback((value: string) => {
    setPostUrl(value);
    const detected = detectPlatform(value);
    if (detected) {
      setPlatform(detected);
    }
  }, []);

  const handleUrlBlur = useCallback(() => {
    const detected = detectPlatform(postUrl);
    save({ post_url: postUrl, platform: detected || platform });
  }, [postUrl, platform]);

  const detectedInfo = PLATFORMS.find((p) => p.key === platform);

  return (
    <div className="space-y-3">
      {/* Platform badges */}
      <div className="flex gap-1.5 flex-wrap">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPlatform(p.key); save({ platform: p.key }); }}
            className={`px-2.5 py-1 rounded-md font-body text-xs font-medium transition-colors duration-150
              ${platform === p.key
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div>
        <input
          type="url"
          value={postUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Paste post URL..."
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
        />
        {detectedInfo && postUrl.trim() && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="font-body text-[11px] text-brand-accent">
              Detected: {detectedInfo.label}
            </span>
            {'note' in detectedInfo && detectedInfo.note && (
              <span className="font-body text-[10px] text-brand-text-muted">
                — {detectedInfo.note}
              </span>
            )}
          </div>
        )}
      </div>

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
