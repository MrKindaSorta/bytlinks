import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { UsernameClaimInput } from './UsernameClaimInput';
import { MiniPagePreview } from './MiniPagePreview';
import { SHOWCASE_PAGES } from './showcaseData';

const EASE = [0.25, 0.1, 0.25, 1] as const;

export function FinalCTA() {
  const reduced = useReducedMotion() ?? false;
  const thumbPages = SHOWCASE_PAGES.slice(0, 5);

  return (
    <section className="bg-brand-accent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Mini preview thumbnails */}
          <div className="flex items-center gap-3 mb-8">
            {thumbPages.map((page) => (
              <MiniPagePreview key={page.label} page={page} size="small" />
            ))}
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-900 tracking-[-0.03em] text-white leading-[1.1] mb-4">
            Your page is one<br />
            minute away.
          </h2>
          <p className="font-body text-base sm:text-lg text-white/80 leading-relaxed mb-8 max-w-md">
            Free forever. No credit card. Cancel nothing.
          </p>

          <div className="w-full flex justify-center">
            <UsernameClaimInput inverted />
          </div>

          <p className="font-body text-xs text-white/50 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-white/70 hover:text-white underline">Log in</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
