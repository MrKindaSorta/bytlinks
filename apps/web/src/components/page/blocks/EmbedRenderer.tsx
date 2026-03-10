import { useRef, useState } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { EmbedBlockData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';
import { EMBED_PROVIDERS, detectEmbedProvider } from './embedProviders';
import type { EmbedProvider } from './embedProviders';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function resolveProvider(data: EmbedBlockData): { provider: EmbedProvider; src: string } | null {
  // First try to match by embed_type for backwards compat
  if (data.embed_type) {
    const byType = EMBED_PROVIDERS.find((p) => p.id === data.embed_type);
    if (byType) {
      const src = byType.getEmbedSrc(data.embed_url);
      if (src) return { provider: byType, src };
    }
  }
  // Then try auto-detect from URL
  const detected = detectEmbedProvider(data.embed_url);
  if (detected) {
    const src = detected.getEmbedSrc(data.embed_url);
    if (src) return { provider: detected, src };
  }
  return null;
}

export function EmbedRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as EmbedBlockData;
  const trackedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  if (!data.embed_url) return null;

  const resolved = resolveProvider(data);
  if (!resolved) return null;

  const { provider, src } = resolved;
  const isYouTube = provider.id === 'youtube';
  const youtubeId = isYouTube ? getYouTubeId(data.embed_url) : null;

  function handleInteract() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    trackEvent(pageId, 'embed_interact', { blockId: block.id });
  }

  return (
    <div
      className="scroll-reveal my-6 rounded-xl overflow-hidden"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
      onMouseDown={handleInteract}
      onTouchStart={handleInteract}
    >
      <div
        className="relative"
        style={provider.aspectRatio ? { aspectRatio: provider.aspectRatio, width: '100%' } : undefined}
      >
        {/* YouTube thumbnail preview before load */}
        {isYouTube && youtubeId && !loaded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundImage: `url(https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        <iframe
          src={src}
          title={`${provider.label} embed`}
          className="w-full border-0"
          style={{
            height: provider.aspectRatio ? '100%' : provider.height || 315,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
