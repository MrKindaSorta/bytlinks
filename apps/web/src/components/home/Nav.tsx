import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import logoSrc from '../../logo/BytLinks.png';

export function Nav() {
  const { scrollY } = useScroll();
  const reduced = useReducedMotion() ?? false;
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const bgOpacity = useTransform(scrollY, [0, 60], [0.85, 0.95]);

  // CTA pulse on first load
  const [pulsed, setPulsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPulsed(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-2xl border-b border-transparent relative">
      {/* Scroll-linked bg overlay */}
      <motion.div
        className="absolute inset-0 bg-brand-bg -z-10"
        style={{ opacity: reduced ? 0.95 : bgOpacity }}
      />
      {/* Scroll-linked teal bottom border */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-brand-accent"
        style={{ opacity: reduced ? 0.2 : borderOpacity }}
      />
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto">
        <a href="/" aria-label="BytLinks home">
          <img src={logoSrc} alt="BytLinks" className="h-14 sm:h-16" />
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="font-body text-sm font-medium text-brand-text-secondary
                       transition-colors duration-150 hover:text-brand-text"
          >
            Log in
          </Link>
          <motion.div
            animate={
              !reduced && pulsed
                ? { scale: [1, 1.04, 1], transition: { duration: 0.4, ease: 'easeInOut' } }
                : undefined
            }
          >
            <Link
              to="/signup"
              className="font-body text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg
                         bg-brand-accent text-white
                         transition-all duration-150 hover:bg-brand-accent-hover"
            >
              Get started — free
            </Link>
          </motion.div>
        </div>
      </div>
    </nav>
  );
}
