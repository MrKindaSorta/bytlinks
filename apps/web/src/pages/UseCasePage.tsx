import { useParams, Navigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Music, Calendar, Timer, BarChart2, CreditCard, CalendarCheck,
  Star, Images, ShoppingBag, MapPin, Palette, Monitor, Layout,
  Rss, Download, Mic, Mail, Users, FileText, ChevronRight,
} from 'lucide-react';
import { PageHead } from '../components/PageHead';
import { Nav } from '../components/home/Nav';
import { Footer } from '../components/home/Footer';
import { FinalCTA } from '../components/home/FinalCTA';
import { USE_CASES } from '../data/useCases';
import type { UseCaseConfig } from '../data/useCases';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Music, Calendar, Timer, BarChart2, CreditCard, CalendarCheck,
  Star, Images, ShoppingBag, MapPin, Palette, Desktop: Monitor,
  Layout, Rss, Download, Mic, Mail, Users, FileText,
};

function HeroSection({ config, reduced }: { config: UseCaseConfig; reduced: boolean }) {
  const words = config.heroHeadline.split(' ');

  return (
    <section className="py-24 bg-brand-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-4">
          {config.audience}
        </p>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-900 tracking-[-0.04em] text-brand-text leading-[1.1]">
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block mr-[0.25em]"
              initial={reduced ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <p className="font-body text-base sm:text-lg text-brand-text-secondary max-w-xl mt-4 leading-relaxed">
          {config.heroSubhead}
        </p>

        <motion.div
          className="mt-8"
          initial={reduced ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.3 }}
        >
          <Link
            to="/signup"
            className="inline-block font-body text-sm font-semibold px-6 py-3 rounded-lg
                       bg-brand-accent text-white
                       transition-colors duration-150 hover:bg-brand-accent-hover"
          >
            {config.primaryCTA}
          </Link>
        </motion.div>

        <p className="font-body text-sm text-brand-text-muted italic mt-6">
          {config.painPoint}
        </p>
      </div>
    </section>
  );
}

function FeaturesSection({ config, reduced }: { config: UseCaseConfig; reduced: boolean }) {
  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <section className="py-24" style={{ background: 'color-mix(in srgb, var(--brand-surface-alt) 40%, transparent)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
          Built for {config.audience.toLowerCase()}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text mb-10">
          Everything you need on one page.
        </h2>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
          variants={reduced ? undefined : container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {config.features.map((f) => {
            const Icon = ICON_MAP[f.icon];
            return (
              <motion.div
                key={f.title}
                className="bg-brand-surface border border-brand-border rounded-2xl p-6"
                variants={reduced ? undefined : item}
              >
                {Icon && <Icon className="w-6 h-6 text-brand-accent" />}
                <h3 className="font-body text-sm font-medium text-brand-text mt-3">{f.title}</h3>
                <p className="font-body text-sm text-brand-text-secondary mt-1">{f.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function TemplatePreview({ config }: { config: UseCaseConfig }) {
  return (
    <section className="py-24 bg-brand-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
          Made for you
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text mb-3">
          Start with the {config.templateSlug} template.
        </h2>
        <p className="font-body text-sm text-brand-text-secondary mb-10">
          Pre-styled and ready to customize. Takes 60 seconds to set up.
        </p>

        <div className="inline-block rounded-2xl border border-brand-border bg-brand-surface p-8 mb-8">
          <div className="w-48 h-64 mx-auto rounded-xl border border-brand-border bg-brand-bg flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-surface-alt border border-brand-border" />
            <div className="h-2 w-20 bg-brand-border rounded" />
            <div className="h-1.5 w-16 bg-brand-border/60 rounded" />
            <div className="space-y-2 w-32 mt-2">
              <div className="h-6 rounded bg-brand-surface-alt border border-brand-border" />
              <div className="h-6 rounded bg-brand-surface-alt border border-brand-border" />
              <div className="h-6 rounded bg-brand-surface-alt border border-brand-border" />
            </div>
          </div>
          <p className="font-body text-xs text-brand-text-muted mt-4 capitalize">{config.templateSlug} template</p>
        </div>

        <div>
          <Link
            to="/signup"
            className="inline-block font-body text-sm font-semibold px-6 py-3 rounded-lg
                       bg-brand-accent text-white
                       transition-colors duration-150 hover:bg-brand-accent-hover"
          >
            {config.primaryCTA}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ComparisonNudge() {
  return (
    <section className="py-12" style={{ background: 'color-mix(in srgb, var(--brand-surface-alt) 40%, transparent)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="font-body text-sm text-brand-text-secondary">
          Switching from Linktree? Import your links in 30 seconds.{' '}
          <Link
            to="/signup?from=linktree"
            className="text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
          >
            &rarr;
          </Link>
        </p>
      </div>
    </section>
  );
}

function RelatedUseCases({ config }: { config: UseCaseConfig }) {
  const related = config.relatedSlugs
    .map((slug) => USE_CASES.find((uc) => uc.slug === slug))
    .filter(Boolean) as UseCaseConfig[];

  return (
    <section className="py-16 bg-brand-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h3 className="font-body text-sm font-medium text-brand-text-secondary uppercase tracking-[0.14em] mb-5">
          Also built for
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {related.map((uc) => (
            <Link
              key={uc.slug}
              to={`/for/${uc.slug}`}
              className="flex items-center justify-between border border-brand-border rounded-2xl p-5
                         hover:bg-brand-surface-alt transition-colors duration-150"
            >
              <span className="font-body text-sm font-medium text-brand-text">{uc.title}</span>
              <ChevronRight className="w-4 h-4 text-brand-text-muted flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function UseCasePage() {
  const { usecase } = useParams<{ usecase: string }>();
  const reduced = useReducedMotion() ?? false;
  const config = USE_CASES.find((uc) => uc.slug === usecase);

  if (!config) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <PageHead title={config.metaTitle} description={config.metaDescription} />
      <Nav />
      <HeroSection config={config} reduced={reduced} />
      <FeaturesSection config={config} reduced={reduced} />
      <TemplatePreview config={config} />
      <ComparisonNudge />
      <RelatedUseCases config={config} />
      <FinalCTA />
      <Footer />
    </div>
  );
}
