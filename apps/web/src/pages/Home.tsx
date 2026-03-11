import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import logoSrc from '../logo/BytLinks.png';

import { HeroSection } from '../components/home/HeroSection';
import { ConceptBar } from '../components/home/ConceptBar';
import { StyleShowcase } from '../components/home/StyleShowcase';
import { AudienceSpotlight } from '../components/home/AudienceSpotlight';
import { FeatureDeepDive } from '../components/home/FeatureDeepDive';
import { ComparisonTable } from '../components/home/ComparisonTable';
import { BuildGallery } from '../components/home/BuildGallery';
import { PricingSection } from '../components/home/PricingSection';
import { FinalCTA } from '../components/home/FinalCTA';

function Nav() {
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

function Footer() {
  return (
    <footer className="border-t border-brand-accent/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <img src={logoSrc} alt="BytLinks" className="h-10 mb-2" />
            <p className="font-body text-xs text-brand-text-muted max-w-xs leading-relaxed">
              A fast, beautiful bio page for creators, freelancers, and brands.
              Your link. Your brand. Your data.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer navigation">
            {[
              { label: 'Log in', to: '/login' },
              { label: 'Sign up', to: '/signup' },
              { label: 'Demo', to: '/demo' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="font-body text-sm text-brand-text-muted hover:text-brand-text transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-body text-xs text-brand-text-muted">
            &copy; {new Date().getFullYear()} BytLinks. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="font-body text-xs text-brand-text-muted hover:text-brand-text transition-colors">Privacy</Link>
            <Link to="/terms" className="font-body text-xs text-brand-text-muted hover:text-brand-text transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <Nav />
      <HeroSection />
      <ConceptBar />
      <StyleShowcase />
      <AudienceSpotlight />
      <FeatureDeepDive />
      <ComparisonTable />
      <BuildGallery />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
