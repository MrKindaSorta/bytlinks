import { useEffect, useRef, useState } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import { trackEvent } from '../../../utils/trackEvent';
import { MEDIA_EMBED_PROVIDERS, detectMediaEmbedProvider, normalizeMediaEmbedData } from './mediaEmbedProviders';
import type { MediaEmbedProvider } from './mediaEmbedProviders';

declare global {
  interface Window {
    twttr?: { widgets?: { load?: (el: HTMLElement) => void } };
  }
}

function detectTheme(): 'light' | 'dark' {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim();
  if (!bg) return 'dark';
  if (bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5 ? 'dark' : 'light';
  }
  return 'dark';
}

function Skeleton() {
  return (
    <div
      className="rounded-xl animate-pulse"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.08))',
        minHeight: '300px',
      }}
    />
  );
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function IframeEmbed({ provider, url, onInteract }: { provider: MediaEmbedProvider; url: string; onInteract: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const src = provider.getEmbedSrc?.(url);
  if (!src) return null;

  const isYouTube = provider.id === 'youtube';
  const youtubeId = isYouTube ? getYouTubeId(url) : null;

  return (
    <div
      className="relative"
      style={provider.aspectRatio ? { aspectRatio: provider.aspectRatio, width: '100%' } : undefined}
      onMouseDown={onInteract}
      onTouchStart={onInteract}
    >
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
  );
}

function TwitterWidget({ url, fallbackText, onInteract }: { url: string; fallbackText?: string; onInteract: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const existing = document.querySelector('script[src*="platform.twitter.com"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.twttr?.widgets?.load) {
      window.twttr.widgets.load(containerRef.current);
    }
    const container = containerRef.current;
    const observer = new MutationObserver(() => {
      if (container.querySelector('iframe.twitter-tweet-rendered, .twitter-tweet iframe')) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    const timeout = setTimeout(() => { setLoaded(true); observer.disconnect(); }, 4000);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [url]);

  const theme = detectTheme();

  return (
    <div ref={containerRef} onClick={onInteract} style={{ minHeight: loaded ? undefined : '300px' }}>
      {!loaded && <div className="absolute inset-0"><Skeleton /></div>}
      <blockquote className="twitter-tweet" data-theme={theme}>
        <a href={url}>{fallbackText || 'Loading tweet...'}</a>
      </blockquote>
    </div>
  );
}

function TikTokWidget({ url, fallbackText }: { url: string; fallbackText?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const existing = document.querySelector('script[src*="tiktok.com/embed"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [url]);

  const videoIdMatch = url.match(/\/video\/(\d+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  if (!videoId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: 'var(--page-accent)' }}>
        {fallbackText || 'View on TikTok'}
      </a>
    );
  }

  return (
    <div ref={containerRef}>
      <blockquote className="tiktok-embed" cite={url} data-video-id={videoId} style={{ maxWidth: '100%' }}>
        <section>
          <a href={url} target="_blank" rel="noopener noreferrer">{fallbackText || 'Loading TikTok...'}</a>
        </section>
      </blockquote>
    </div>
  );
}

function BlueskyEmbed({ url, onLoad }: { url: string; onLoad: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/blocks/oembed?url=${encodeURIComponent(url)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.html) {
          setHtml(json.data.html);
          onLoad();
        } else {
          onLoad();
        }
      })
      .catch(() => onLoad());
  }, [url]);

  if (html) {
    return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: 'var(--page-accent)' }}>
      View on Bluesky
    </a>
  );
}

function FallbackCard({ url, platform, fallbackText, onInteract }: { url: string; platform: string; fallbackText?: string; onInteract: () => void }) {
  const platformLabel = platform === 'instagram' ? 'Instagram' : platform || 'Social';
  const platformInitial = platform === 'instagram' ? 'IG' : platform?.charAt(0)?.toUpperCase() || '?';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onInteract}
      className="block rounded-xl px-4 py-3 transition-all duration-200 hover:translate-y-[-1px]"
      style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--page-accent)', color: 'var(--page-bg)', opacity: 0.9 }}
        >
          {platformInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--page-text)' }}>
            {fallbackText || `View on ${platformLabel}`}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--page-accent)', opacity: 0.7 }}>
            {platformLabel}
          </p>
        </div>
      </div>
    </a>
  );
}

export function MediaEmbedRenderer({ block, pageId }: BlockRendererProps) {
  const rawData = block.data as Record<string, unknown>;
  const data = normalizeMediaEmbedData(rawData);
  const trackedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  if (!data.url) return null;

  // Resolve provider from platform field or auto-detect
  let provider: MediaEmbedProvider | null = null;
  if (data.platform) {
    provider = MEDIA_EMBED_PROVIDERS.find((p) => p.id === data.platform) || null;
  }
  if (!provider) {
    provider = detectMediaEmbedProvider(data.url);
  }

  function handleInteract() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    const eventType = block.block_type === 'embed' ? 'embed_interact'
      : block.block_type === 'social-post' ? 'social_post_click'
      : 'media_embed_interact';
    trackEvent(pageId, eventType, { blockId: block.id });
  }

  if (!provider) {
    return (
      <div className="scroll-reveal my-6 rounded-lg border border-brand-border bg-brand-surface-alt p-4 text-center">
        <p className="text-sm text-brand-text-muted">This embed type is not supported.</p>
      </div>
    );
  }

  // iframe providers
  if (provider.renderMode === 'iframe') {
    return (
      <div className="scroll-reveal my-6 rounded-xl overflow-hidden" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}>
        <IframeEmbed provider={provider} url={data.url} onInteract={handleInteract} />
      </div>
    );
  }

  // Twitter widget
  if (provider.id === 'twitter') {
    return (
      <div className="scroll-reveal my-6 relative">
        <TwitterWidget url={data.url} fallbackText={data.fallback_text} onInteract={handleInteract} />
      </div>
    );
  }

  // TikTok widget
  if (provider.id === 'tiktok') {
    return (
      <div className="scroll-reveal my-6" onClick={handleInteract} style={{ minHeight: '300px' }}>
        <TikTokWidget url={data.url} fallbackText={data.fallback_text} />
      </div>
    );
  }

  // Bluesky oEmbed
  if (provider.id === 'bluesky') {
    return (
      <div className="scroll-reveal my-6" onClick={handleInteract} style={{ minHeight: loaded ? undefined : '300px' }}>
        {!loaded && <Skeleton />}
        <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 300ms ease' }}>
          <BlueskyEmbed url={data.url} onLoad={() => setLoaded(true)} />
        </div>
      </div>
    );
  }

  // Fallback card (Instagram, unknown)
  return (
    <div className="scroll-reveal my-6">
      <FallbackCard url={data.url} platform={data.platform} fallbackText={data.fallback_text} onInteract={handleInteract} />
    </div>
  );
}
