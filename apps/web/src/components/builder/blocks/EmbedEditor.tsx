import { useState, useMemo } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { EmbedBlockData } from '@bytlinks/shared';
import { EMBED_PROVIDERS, detectEmbedProvider } from '../../page/blocks/embedProviders';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function EmbedEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as EmbedBlockData;
  const [embedUrl, setEmbedUrl] = useState(data.embed_url || '');

  const detectedProvider = useMemo(() => {
    if (!embedUrl.trim()) return null;
    return detectEmbedProvider(embedUrl);
  }, [embedUrl]);

  const isValid = useMemo(() => {
    if (!embedUrl.trim()) return true;
    if (!detectedProvider) return false;
    return detectedProvider.getEmbedSrc(embedUrl) !== null;
  }, [embedUrl, detectedProvider]);

  function save(url: string) {
    const provider = detectEmbedProvider(url);
    editBlock(block.id, {
      data: { embed_type: provider?.id || data.embed_type || 'youtube', embed_url: url },
    });
  }

  const youtubeId = detectedProvider?.id === 'youtube' && isValid ? getYouTubeId(embedUrl) : null;

  return (
    <div className="space-y-3">
      {/* Provider badges */}
      <div className="flex gap-1.5 flex-wrap">
        {EMBED_PROVIDERS.map((p) => (
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
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          onBlur={() => save(embedUrl)}
          placeholder="Paste a YouTube, Spotify, SoundCloud, Vimeo, Apple Music, Tidal, Bandcamp, or Substack URL"
          className={`w-full px-3 py-2 rounded-lg border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none transition-colors duration-150
            ${!isValid && embedUrl.trim() ? 'border-red-400 focus:border-red-500' : 'border-brand-border focus:border-brand-accent'}`}
        />
        {!isValid && embedUrl.trim() && (
          <p className="font-body text-[11px] text-red-500 mt-1">
            Unsupported URL. Supported: {EMBED_PROVIDERS.map((p) => p.label).join(', ')}
          </p>
        )}
        {detectedProvider && isValid && (
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
    </div>
  );
}
