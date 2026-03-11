import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MiniPagePreview } from './MiniPagePreview';
import { SHOWCASE_PAGES } from './showcaseData';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const TABS = [
  {
    key: 'creators',
    label: 'Creators',
    headline: 'Your audience. One click away.',
    bullets: [
      'One page for your YouTube, TikTok, merch, brand deals, and everything in between.',
      'See exactly which links your audience clicks — and where they come from.',
      'Swap your bio link once. Update content forever without touching your socials.',
    ],
    pageIndex: 4, // Mika Torres - Gradient Flow
  },
  {
    key: 'freelancers',
    label: 'Freelancers',
    headline: 'Your portfolio. Your booking link. One URL.',
    bullets: [
      'Portfolio, booking link, services, testimonials, and contact — all in one place.',
      'Looks better than most websites, takes 60 seconds to set up.',
      'Analytics show which services get the most attention from potential clients.',
    ],
    pageIndex: 0, // Lena Moreau - Minimal
  },
  {
    key: 'musicians',
    label: 'Musicians',
    headline: 'Every platform. Every show. One link.',
    bullets: [
      'Latest release, tour dates, merch, socials, streaming links — all unified.',
      'Embed Spotify, SoundCloud, or Apple Music directly on your page.',
      'A link that actually represents your brand, not a generic list.',
    ],
    pageIndex: 1, // Kai Natsuki - Neon Night
  },
  {
    key: 'businesses',
    label: 'Businesses',
    headline: 'A branded page that converts.',
    bullets: [
      'Products, social channels, contact info, and embedded content in one place.',
      'Server-side analytics — no third-party tracking scripts on your page.',
      'Desktop layout that feels like a real landing page, not a phone screen.',
    ],
    pageIndex: 5, // Juno Park - Brutalist
  },
];

const contentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: EASE },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -20 : 20,
    opacity: 0,
    transition: { duration: 0.2, ease: EASE },
  }),
};

export function AudienceSpotlight() {
  const reduced = useReducedMotion() ?? false;
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const hovering = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    if (hovering.current) return;
    setDirection(1);
    setActiveIdx((prev) => (prev + 1) % TABS.length);
  }, []);

  useEffect(() => {
    const start = () => {
      timerRef.current = setInterval(advance, 5000);
    };
    start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  const handleTabClick = (idx: number) => {
    setDirection(idx > activeIdx ? 1 : -1);
    setActiveIdx(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, 5000);
  };

  const tab = TABS[activeIdx];
  const page = SHOWCASE_PAGES[tab.pageIndex];

  return (
    <section className="bg-brand-surface border-y border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          className="text-center mb-12"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
            Who it's for
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
            Built for anyone with something worth sharing
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => handleTabClick(i)}
              className={`font-body text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150
                ${i === activeIdx
                  ? 'bg-brand-accent text-white'
                  : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface-alt'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center min-h-[420px]"
          onMouseEnter={() => { hovering.current = true; }}
          onMouseLeave={() => { hovering.current = false; }}
        >
          {/* Left: text content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab.key}
              custom={direction}
              variants={reduced ? undefined : contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h3 className="font-display text-2xl sm:text-3xl font-700 tracking-tight text-brand-text mb-6">
                {tab.headline}
              </h3>
              <ul className="space-y-4">
                {tab.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-2 shrink-0" />
                    <span className="font-body text-sm sm:text-base text-brand-text-secondary leading-relaxed">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Right: preview card */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab.key + '-preview'}
              custom={direction}
              variants={reduced ? undefined : contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex justify-center"
            >
              <MiniPagePreview page={page} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
