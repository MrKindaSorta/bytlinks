import { motion, useReducedMotion } from 'framer-motion';
import { HeroDemo } from './HeroDemo';
import { UsernameClaimInput } from './UsernameClaimInput';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const wordContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const wordChild = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function AnimatedHeadline({ reduced }: { reduced: boolean }) {
  const lines = [
    ['One', 'link.'],
    ['Everything'],
    ['people', 'need.'],
  ];

  if (reduced) {
    return (
      <h1 className="font-display text-4xl sm:text-5xl lg:text-[4.25rem] font-900 tracking-[-0.04em] leading-[1.04] text-brand-text mb-5">
        One link.<br />
        Everything<br />
        <em className="not-italic text-brand-accent">people need.</em>
      </h1>
    );
  }

  return (
    <motion.h1
      className="font-display text-4xl sm:text-5xl lg:text-[4.25rem] font-900 tracking-[-0.04em] leading-[1.04] text-brand-text mb-5"
      variants={wordContainer}
      initial="hidden"
      animate="visible"
    >
      {lines.map((words, lineIdx) => (
        <span key={lineIdx}>
          {lineIdx > 0 && <br />}
          {words.map((word, wordIdx) => {
            const isAccent = lineIdx === 2;
            return (
              <motion.span
                key={`${lineIdx}-${wordIdx}`}
                variants={wordChild}
                className={`inline-block ${isAccent ? 'text-brand-accent' : ''}`}
                style={{ marginRight: wordIdx < words.length - 1 ? '0.3em' : 0 }}
              >
                {word}
              </motion.span>
            );
          })}
        </span>
      ))}
    </motion.h1>
  );
}

export function HeroSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-8 sm:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-start">
        {/* Left: copy + username claim */}
        <div>
          <motion.p
            className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-5"
            initial={reduced ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
          >
            Your link-in-bio, done right
          </motion.p>

          <AnimatedHeadline reduced={reduced} />

          <motion.p
            className="font-body text-base sm:text-lg text-brand-text-secondary leading-relaxed max-w-[420px] mb-3"
            initial={reduced ? undefined : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
          >
            Put one URL in your Instagram, TikTok, or email bio.
            Visitors land on your personal page — your links, your content, your brand.
            <span className="text-brand-text font-medium"> BytLinks makes that page actually beautiful.</span>
          </motion.p>
          <motion.p
            className="font-body text-sm text-brand-text-muted max-w-[380px] mb-8 leading-relaxed"
            initial={reduced ? undefined : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
          >
            Think of it as your homepage, without needing a website. Designers, creators,
            freelancers, and brands use it to make a real first impression.
          </motion.p>

          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
          >
            <UsernameClaimInput />
          </motion.div>

          {/* Trust signals */}
          <motion.div
            className="flex items-center gap-4 mt-4"
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <span className="font-body text-sm text-brand-text-muted">✓ Free forever</span>
            <span className="font-body text-sm text-brand-text-muted">✓ No credit card</span>
          </motion.div>

        </div>

        {/* Right: live page preview — overlaps into concept bar via negative margin */}
        <div className="flex justify-center lg:justify-end lg:pt-2 lg:mb-[-60px] relative z-10">
          <motion.div
            className="w-full max-w-[280px] sm:max-w-[310px]"
            initial={reduced ? undefined : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          >
            <HeroDemo />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
