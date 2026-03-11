import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const FREE_FEATURES = [
  'All 12 designer themes',
  'Unlimited links',
  'Basic analytics (views + clicks)',
  'Custom colors and fonts',
  'bytlinks.com/username URL',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Full analytics dashboard',
  'Remove "Powered by BytLinks" badge',
  'Advanced color customization',
  'Priority support',
];

const PRO_COMING_SOON = [
  'Custom domain support',
];

export function PricingSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="bg-brand-surface border-y border-brand-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          className="text-center mb-12"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
            Pricing
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text mb-3">
            Free is actually free
          </h2>
          <p className="font-body text-base text-brand-text-secondary max-w-md mx-auto">
            No features locked behind a 7-day trial. The free plan isn't a demo.
            Upgrade when you need more.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto"
          variants={reduced ? undefined : container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Free tier */}
          <motion.div
            variants={reduced ? undefined : cardVariant}
            className="p-6 sm:p-8 rounded-xl border border-brand-border bg-brand-bg"
          >
            <div className="mb-1">
              <span className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">Free plan</span>
            </div>
            <div className="font-display text-4xl font-900 text-brand-text tracking-tight mb-1">$0</div>
            <div className="font-body text-sm text-brand-text-muted mb-6">forever, no credit card</div>
            <ul className="space-y-2.5 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                  <span className="font-body text-sm text-brand-text-secondary">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="block w-full text-center font-body text-sm font-semibold py-3 rounded-lg
                         border border-brand-border text-brand-text
                         transition-all duration-150 hover:border-brand-accent/50 hover:bg-brand-surface"
            >
              Get started free
            </Link>
          </motion.div>

          {/* Pro tier */}
          <motion.div
            variants={reduced ? undefined : cardVariant}
            className="p-6 sm:p-8 rounded-xl border-2 border-brand-accent/40 bg-brand-bg relative"
          >
            <div className="absolute top-4 right-4">
              <span className="font-body text-xs font-semibold px-2.5 py-1 rounded-full
                               bg-brand-accent/10 text-brand-accent">
                ⚡ Early access
              </span>
            </div>
            <div className="mb-1">
              <span className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">Pro plan</span>
            </div>
            <div className="font-display text-4xl font-900 text-brand-text tracking-tight mb-1">
              $9.99
            </div>
            <div className="font-body text-sm text-brand-text-muted mb-6">per month</div>
            <ul className="space-y-2.5 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                  <span className="font-body text-sm text-brand-text-secondary">{f}</span>
                </li>
              ))}
              {PRO_COMING_SOON.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-text-muted/40 mt-0.5 shrink-0" />
                  <span className="font-body text-sm text-brand-text-muted">
                    {f}
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-accent/70">
                      Coming soon
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup?plan=pro"
              className="block w-full text-center font-body text-sm font-semibold py-3 rounded-lg
                         bg-brand-accent text-white
                         transition-all duration-150 hover:bg-brand-accent-hover"
            >
              Start free, upgrade anytime
            </Link>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
