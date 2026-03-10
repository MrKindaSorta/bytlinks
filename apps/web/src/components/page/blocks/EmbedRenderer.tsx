import { useRef, useState } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { EmbedBlockData, EmbedType } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function getEmbedSrc(embedType: EmbedType, url: string): string | null {
  switch (embedType) {
    case 'youtube': {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
    }
    case 'spotify': {
      const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
      if (!match) return null;
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
    }
    default:
      return null;
  }
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function EmbedRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as EmbedBlockData;
  const trackedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  if (!data.embed_url) return null;

  const src = getEmbedSrc(data.embed_type, data.embed_url);
  if (!src) return null;

  const isSpotify = data.embed_type === 'spotify';
  const isYouTube = data.embed_type === 'youtube';
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
        style={isYouTube ? { aspectRatio: '16 / 9', width: '100%' } : undefined}
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
          title={`${data.embed_type} embed`}
          className="w-full border-0"
          style={{
            height: isYouTube ? '100%' : isSpotify ? 152 : 315,
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
