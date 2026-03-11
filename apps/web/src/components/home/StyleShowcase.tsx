import { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MiniPagePreview } from './MiniPagePreview';
import { SHOWCASE_PAGES } from './showcaseData';

const EASE = [0.25, 0.1, 0.25, 1] as const;

export function StyleShowcase() {
  const reduced = useReducedMotion() ?? false;
  const stripRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Double the pages for seamless loop on desktop
  const displayPages = isMobile ? SHOWCASE_PAGES : [...SHOWCASE_PAGES, ...SHOWCASE_PAGES];

  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-10">
        {/* Heading with clipPath reveal */}
        <motion.div
          initial={reduced ? undefined : { clipPath: 'inset(0 100% 0 0)' }}
          whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-800 tracking-tight text-brand-text">
            12 themes. Every one included free.
          </h2>
        </motion.div>

        <motion.p
          className="font-body text-sm text-brand-text-secondary max-w-md mt-4 leading-relaxed"
          initial={reduced ? undefined : { opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
        >
          Each theme has its own typography system, layout behavior, and spacing philosophy.
          Not twelve color swaps — twelve completely different looks.
        </motion.p>
      </div>

      {/* Scrollable strip with CSS mask-image fade on edges */}
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      >
        <div
          className="relative"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            ref={stripRef}
            className={`flex gap-5 pb-4 pl-4 sm:pl-[calc((100vw-72rem)/2+1.5rem)] pr-6 ${
              isMobile ? 'overflow-x-auto' : ''
            }`}
            style={{
              scrollbarWidth: 'none',
              ...(isMobile
                ? {}
                : {
                    animation: 'showcase-scroll 40s linear infinite',
                    animationPlayState: isHovered ? 'paused' : 'running',
                  }),
            }}
          >
            {displayPages.map((page, idx) => (
              <MiniPagePreview key={`${page.label}-${idx}`} page={page} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Proof line */}
      <motion.p
        className="text-center font-body text-sm text-brand-text-muted mt-8"
        initial={reduced ? undefined : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        Used by creators in 40+ countries
      </motion.p>
    </section>
  );
}
