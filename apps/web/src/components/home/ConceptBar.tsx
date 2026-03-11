import { Globe, Palette, BarChart2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const concepts = [
  { icon: Globe, label: 'One URL for everything', body: 'Share a single link — your page holds all your links, social profiles, and content.' },
  { icon: Palette, label: 'Looks like you designed it', body: '12 completely different aesthetics. Pick one, customize it, and it\'s yours.' },
  { icon: BarChart2, label: 'Real analytics, built in', body: 'See your views, clicks, countries, and referrers. No extra tools required.' },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const iconItem = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: [0.8, 1.1, 1.0],
    transition: { duration: 0.4, ease: EASE },
  },
};

const textItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function ConceptBar() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section
      className="border-y border-brand-border"
      style={{
        background: 'linear-gradient(90deg, var(--brand-bg), var(--brand-surface-alt), var(--brand-bg))',
      }}
    >
      <motion.div
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8"
        variants={reduced ? undefined : container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x divide-brand-border">
          {concepts.map(({ icon: Icon, label, body }) => (
            <motion.div
              key={label}
              className="flex items-start gap-4 sm:px-8 first:sm:pl-0 last:sm:pr-0"
              variants={reduced ? undefined : textItem}
            >
              <motion.div
                className="w-9 h-9 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0 mt-0.5"
                variants={reduced ? undefined : iconItem}
              >
                <Icon className="w-[18px] h-[18px] text-brand-accent" />
              </motion.div>
              <div>
                <div className="font-display text-sm font-700 text-brand-text mb-1">{label}</div>
                <div className="font-body text-xs text-brand-text-secondary leading-relaxed">{body}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Use-case links */}
      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 mt-6 pt-5 border-t border-brand-border">
        <span className="font-body text-xs text-brand-text-muted mr-1">Built for:</span>
        {[
          { label: 'Creators', slug: 'creators' },
          { label: 'Musicians', slug: 'musicians' },
          { label: 'Freelancers', slug: 'freelancers' },
          { label: 'Businesses', slug: 'businesses' },
          { label: 'Podcasters', slug: 'podcasters' },
          { label: 'Coaches', slug: 'coaches' },
        ].map(({ label, slug }, i, arr) => (
          <span key={slug} className="font-body text-xs">
            <a
              href={`/for/${slug}`}
              className="text-brand-text-muted hover:text-brand-accent transition-colors duration-150"
            >
              {label}
            </a>
            {i < arr.length - 1 && (
              <span className="text-brand-border ml-1">&middot;</span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}
