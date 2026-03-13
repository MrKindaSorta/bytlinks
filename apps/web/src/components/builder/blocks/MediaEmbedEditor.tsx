import { useState, useMemo, useCallback } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { MediaEmbedData } from '@bytlinks/shared';
import { MEDIA_EMBED_PROVIDERS, detectMediaEmbedProvider, normalizeMediaEmbedData } from '../../page/blocks/mediaEmbedProviders';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function MediaEmbedEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const normalized = normalizeMediaEmbedData(block.data as Record<string, unknown>);
  const [url, setUrl] = useState(normalized.url);
  const [fallbackText, setFallbackText] = useState(normalized.fallback_text || '');

  const detectedProvider = useMemo(() => {
    if (!url.trim()) return null;
    return detectMediaEmbedProvider(url);
  }, [url]);

  const isSocial = detectedProvider?.category === 'social';

  const save = useCallback((updates: Partial<MediaEmbedData>) => {
    const provider = detectMediaEmbedProvider(url);
    editBlock(block.id, {
      data: { platform: provider?.id || '', url, fallback_text: fallbackText || undefined, ...updates },
    });
  }, [url, fallbackText, editBlock, block.id]);

  const youtubeId = detectedProvider?.id === 'youtube' ? getYouTubeId(url) : null;

  return (
    <div className="space-y-3">
      {/* Provider badges */}
      <div className="flex gap-1.5 flex-wrap">
        {MEDIA_EMBED_PROVIDERS.map((p) => (
          <span
            key={p.id}
            className={`px-2 py-0.5 rounded-md font-body text-[10px] font-medium uppercase tracking-wider
              ${detectedProvider?.id === p.id
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-muted'
              }`}
          >
            {p.label}
          </span>
        ))}
      </div>
      <div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => save({ url })}
          placeholder="Paste a YouTube, Spotify, Twitter/X, TikTok, or other URL"
          className={`w-full px-3 py-2 rounded-lg border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none transition-colors duration-150
            ${url.trim() && !detectedProvider ? 'border-red-400 focus:border-red-500' : 'border-brand-border focus:border-brand-accent'}`}
        />
        {url.trim() && !detectedProvider && (
          <p className="font-body text-[11px] text-red-500 mt-1">
            Unsupported URL. Supported: {MEDIA_EMBED_PROVIDERS.map((p) => p.label).join(', ')}
          </p>
        )}
        {detectedProvider && (
          <p className="font-body text-[11px] text-brand-accent mt-1">
            Detected: {detectedProvider.label}
          </p>
        )}
      </div>
      {/* YouTube thumbnail preview */}
      {youtubeId && (
        <div className="rounded-lg overflow-hidden bg-brand-surface-alt">
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-auto"
          />
        </div>
      )}
      {/* Fallback text for social embeds */}
      {isSocial && (
        <input
          type="text"
          value={fallbackText}
          onChange={(e) => setFallbackText(e.target.value)}
          onBlur={() => save({ fallback_text: fallbackText || undefined })}
          placeholder="Fallback text (optional)"
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
        />
      )}
    </div>
  );
}
