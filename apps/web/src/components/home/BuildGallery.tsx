import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MiniPagePreview } from './MiniPagePreview';
import { SHOWCASE_PAGES } from './showcaseData';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function BuildGallery() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        className="text-center mb-12"
        initial={reduced ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
          Real pages
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
          See what people are building
        </h2>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 justify-items-center"
        variants={reduced ? undefined : container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {SHOWCASE_PAGES.map((page) => (
          <motion.div
            key={page.label}
            variants={reduced ? undefined : cardVariant}
            whileHover={reduced ? undefined : { y: -8, transition: { duration: 0.2 } }}
            className="cursor-default"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(28,25,23,0.06))' }}
          >
            <MiniPagePreview page={page} />
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        className="text-center mt-10"
        initial={reduced ? undefined : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Link
          to="/signup"
          className="font-body text-sm font-medium text-brand-text-secondary hover:text-brand-accent transition-colors duration-150"
        >
          Your page could be next. It takes 60 seconds. →
        </Link>
      </motion.p>
    </section>
  );
}
