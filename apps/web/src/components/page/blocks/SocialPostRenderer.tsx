import { useEffect, useRef, useState } from 'react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { SocialPostData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

declare global {
  interface Window {
    twttr?: { widgets?: { load?: (el: HTMLElement) => void } };
  }
}

function detectTheme(): 'light' | 'dark' {
  // Read theme from page context — check computed background luminance
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim();
  if (!bg) return 'dark';
  // Simple heuristic: if the background starts with a dark color
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

function TikTokEmbed({ url, fallbackText }: { url: string; fallbackText?: string }) {
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

  // Extract video ID from TikTok URL
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
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={videoId}
        style={{ maxWidth: '100%' }}
      >
        <section>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {fallbackText || 'Loading TikTok...'}
          </a>
        </section>
      </blockquote>
    </div>
  );
}

export function SocialPostRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as SocialPostData;
  const containerRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef(false);
  const [twitterLoaded, setTwitterLoaded] = useState(false);

  function handleClick() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    trackEvent(pageId, 'social_post_click', { blockId: block.id });
  }

  useEffect(() => {
    if (!data.post_url || !containerRef.current) return;

    if (data.platform === 'twitter') {
      const existing = document.querySelector('script[src*="platform.twitter.com"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        document.head.appendChild(script);
      } else if (window.twttr?.widgets?.load) {
        window.twttr.widgets.load(containerRef.current);
      }

      // Detect when Twitter widget iframe appears
      const container = containerRef.current;
      const observer = new MutationObserver(() => {
        if (container.querySelector('iframe.twitter-tweet-rendered, .twitter-tweet iframe')) {
          setTwitterLoaded(true);
          observer.disconnect();
        }
      });
      observer.observe(container, { childList: true, subtree: true });
      // Fallback timeout
      const timeout = setTimeout(() => { setTwitterLoaded(true); observer.disconnect(); }, 4000);
      return () => { observer.disconnect(); clearTimeout(timeout); };
    }
  }, [data.post_url, data.platform]);

  if (!data.post_url) return null;

  if (data.platform === 'twitter') {
    const theme = detectTheme();
    return (
      <div className="scroll-reveal my-6 relative" ref={containerRef} onClick={handleClick} style={{ minHeight: twitterLoaded ? undefined : 250 }}>
        {!twitterLoaded && (
          <div
            className="absolute inset-0 rounded-xl animate-pulse"
            style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.08))' }}
          />
        )}
        <blockquote className="twitter-tweet" data-theme={theme}>
          <a href={data.post_url}>{data.fallback_text || 'Loading tweet...'}</a>
        </blockquote>
      </div>
    );
  }

  if (data.platform === 'tiktok') {
    return (
      <div className="scroll-reveal my-6" onClick={handleClick}>
        <TikTokEmbed url={data.post_url} fallbackText={data.fallback_text} />
      </div>
    );
  }

  // Instagram and other platforms — fallback with styled link card
  return (
    <a
      href={data.post_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="scroll-reveal my-6 block rounded-xl px-4 py-3"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
        transition: 'transform 200ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--page-accent)', color: 'var(--page-bg)', opacity: 0.9 }}
        >
          {data.platform === 'instagram' ? 'IG' : data.platform?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--page-text)' }}>
            {data.fallback_text || `View post on ${data.platform}`}
          </p>
          <p className="text-[11px] capitalize" style={{ color: 'var(--page-accent)', opacity: 0.7 }}>
            {data.platform}
          </p>
        </div>
      </div>
    </a>
  );
}
