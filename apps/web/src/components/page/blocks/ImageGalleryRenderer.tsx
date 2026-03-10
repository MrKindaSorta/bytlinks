import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { ImageGalleryData } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: visible ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(8px)' : 'blur(0)',
        transition: 'background 200ms ease, backdrop-filter 200ms ease',
      }}
      onClick={handleClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
        onClick={handleClose}
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function ImageGalleryRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as ImageGalleryData;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; alt: string } | null>(null);
  const trackedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);

  function handleView() {
    if (trackedRef.current || !pageId) return;
    trackedRef.current = true;
    trackEvent(pageId, 'gallery_view', { blockId: block.id });
  }

  const goTo = useCallback((newIndex: number) => {
    if (transitioning) return;
    handleView();
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setTransitioning(false);
    }, 200);
  }, [transitioning]);

  function prev() {
    goTo((currentIndex - 1 + data.images.length) % data.images.length);
  }

  function next() {
    goTo((currentIndex + 1) % data.images.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    touchStartRef.current = null;
  }

  function openLightbox(r2_key: string, alt: string) {
    handleView();
    setLightboxSrc({ src: `/api/public/file/${r2_key}`, alt });
  }

  if (!data.images?.length) return null;

  if (data.layout === 'single') {
    const img = data.images[0];
    return (
      <>
        <div
          className="scroll-reveal my-6 rounded-xl overflow-hidden cursor-pointer"
          onClick={() => openLightbox(img.r2_key, img.alt || '')}
        >
          <img
            src={`/api/public/file/${img.r2_key}`}
            alt={img.alt || ''}
            className="w-full transition-transform duration-300 hover:scale-[1.02]"
          />
          {img.caption && (
            <p className="text-xs py-2 text-center" style={{ color: 'var(--page-text)', opacity: 0.5 }}>
              {img.caption}
            </p>
          )}
        </div>
        {lightboxSrc && <Lightbox {...lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </>
    );
  }

  if (data.layout === 'carousel') {
    const img = data.images[currentIndex];
    return (
      <>
        <div
          className="scroll-reveal my-6 rounded-xl overflow-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="cursor-pointer"
            onClick={() => openLightbox(img.r2_key, img.alt || '')}
          >
            <img
              src={`/api/public/file/${img.r2_key}`}
              alt={img.alt || ''}
              className="w-full"
              style={{
                opacity: transitioning ? 0 : 1,
                transform: transitioning ? 'translateX(8px)' : 'translateX(0)',
                transition: 'opacity 200ms ease, transform 200ms ease',
              }}
            />
          </div>
          {data.images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {data.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === currentIndex ? 16 : 6,
                      height: 6,
                      background: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {img.caption && (
            <p className="text-xs py-2 text-center" style={{ color: 'var(--page-text)', opacity: 0.5 }}>
              {img.caption}
            </p>
          )}
        </div>
        {lightboxSrc && <Lightbox {...lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </>
    );
  }

  // grid
  return (
    <>
      <div className="scroll-reveal my-6 grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
        {data.images.map((img) => (
          <div
            key={img.r2_key}
            className="aspect-square overflow-hidden cursor-pointer group"
            onClick={() => openLightbox(img.r2_key, img.alt || '')}
          >
            <img
              src={`/api/public/file/${img.r2_key}`}
              alt={img.alt || ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
      {lightboxSrc && <Lightbox {...lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
