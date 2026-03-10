import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AvatarLightboxProps {
  src: string;
  alt: string;
}

/**
 * Clickable avatar that animates into a centered lightbox circle.
 * Uses FLIP animation: captures the thumbnail's bounding rect,
 * then transitions to the expanded size/position via CSS transforms.
 *
 * The overlay is portaled to document.body so that ancestor transforms
 * (from entrance animations like slide-up, scale, blur-in) don't break
 * the fixed positioning.
 */
export function AvatarLightbox({ src, alt }: AvatarLightboxProps) {
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0, size: 0 });

  const expandedSize = Math.min(window.innerWidth - 48, 320);

  const open = useCallback(() => {
    if (!thumbRef.current) return;
    const rect = thumbRef.current.getBoundingClientRect();
    setOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: rect.width,
    });
    setIsOpen(true);
    setAnimating(true);
    setClosing(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimating(false));
    });
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    setAnimating(true);
  }, []);

  function handleTransitionEnd() {
    if (closing && animating) {
      setIsOpen(false);
      setAnimating(false);
      setClosing(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Calculate transform from center-screen to thumbnail origin
  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  const collapsed = animating;
  const translateX = origin.x - centerX;
  const translateY = origin.y - centerY;
  const scale = origin.size / expandedSize;

  return (
    <>
      {/* Thumbnail — always in the DOM flow */}
      <div
        ref={thumbRef}
        onClick={open}
        className="w-24 h-24 rounded-full mb-4 overflow-hidden cursor-pointer
                   transition-opacity duration-150 hover:opacity-85"
        style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Lightbox overlay — portaled to body to escape ancestor transforms */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={close}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 transition-opacity"
            style={{
              transitionDuration: '300ms',
              opacity: collapsed ? 0 : 1,
            }}
          />

          {/* Expanded avatar circle */}
          <div
            className="relative rounded-full overflow-hidden shadow-2xl"
            style={{
              width: expandedSize,
              height: expandedSize,
              transitionProperty: 'transform, opacity',
              transitionDuration: '400ms',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: collapsed
                ? `translate(${translateX}px, ${translateY}px) scale(${scale})`
                : 'translate(0, 0) scale(1)',
              opacity: collapsed ? 0.6 : 1,
            }}
            onClick={(e) => e.stopPropagation()}
            onTransitionEnd={handleTransitionEnd}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm
                       flex items-center justify-center text-white/90 hover:text-white
                       transition-opacity"
            style={{
              transitionDuration: '300ms',
              opacity: collapsed ? 0 : 1,
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
