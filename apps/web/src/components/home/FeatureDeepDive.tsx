import { Link } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const blockItem = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
};

/* ── Feature 1: Analytics mockup data ── */
const CLICK_DATA = [
  { day: 'Mon', clicks: 42 },
  { day: 'Tue', clicks: 67 },
  { day: 'Wed', clicks: 55 },
  { day: 'Thu', clicks: 89 },
  { day: 'Fri', clicks: 73 },
  { day: 'Sat', clicks: 98 },
  { day: 'Sun', clicks: 61 },
];

const TOP_COUNTRIES = [
  { name: 'United States', pct: 38 },
  { name: 'United Kingdom', pct: 14 },
  { name: 'Germany', pct: 11 },
  { name: 'Canada', pct: 8 },
  { name: 'Brazil', pct: 6 },
];

const TOP_REFERRERS = [
  { name: 'Instagram', pct: 44 },
  { name: 'Twitter / X', pct: 22 },
  { name: 'Direct', pct: 18 },
  { name: 'TikTok', pct: 12 },
];

/* ── Feature 2: Block types ── */
const BLOCK_TYPES = [
  'Embed', 'Microblog', 'Rich Link', 'Social Post', 'Image Gallery',
  'Collabs', 'Schedule', 'Poll', 'Testimonials', 'Newsletter',
  'FAQ', 'Quote', 'File Download', 'Countdown', 'Booking',
  'Stats', 'Tip Jar', 'Event', 'Product Card',
];

/* ── Sub-components ── */

function AnalyticsMockup() {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-bg p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-sm font-700 text-brand-text">Your dashboard</span>
        <span className="font-body text-xs text-brand-text-muted">Last 7 days</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Views', val: '1,247' },
          { label: 'Clicks', val: '485' },
          { label: 'CTR', val: '38.9%' },
        ].map((s) => (
          <div key={s.label}>
            <div className="font-display text-lg sm:text-xl font-800 text-brand-text">{s.val}</div>
            <div className="font-body text-xs text-brand-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[140px] mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={CLICK_DATA} barSize={20}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--brand-text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: 'var(--brand-surface)',
                border: '1px solid var(--brand-border)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
              }}
            />
            <Bar dataKey="clicks" fill="var(--brand-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Countries + Referrers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-body text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">Top Countries</div>
          {TOP_COUNTRIES.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-1">
              <span className="font-body text-xs text-brand-text-secondary">{c.name}</span>
              <span className="font-body text-xs text-brand-text-muted">{c.pct}%</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-body text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">Top Referrers</div>
          {TOP_REFERRERS.map((r) => (
            <div key={r.name} className="flex items-center justify-between py-1">
              <span className="font-body text-xs text-brand-text-secondary">{r.name}</span>
              <span className="font-body text-xs text-brand-text-muted">{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockGrid({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      className="grid grid-cols-4 sm:grid-cols-5 gap-2"
      variants={reduced ? undefined : container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {BLOCK_TYPES.map((name) => (
        <motion.div
          key={name}
          variants={reduced ? undefined : blockItem}
          className="rounded-lg border border-brand-border bg-brand-bg px-2 py-2.5 text-center
                     hover:border-brand-accent/40 hover:bg-brand-accent/5 transition-colors duration-150"
        >
          <span className="font-body text-[10px] sm:text-xs font-medium text-brand-text-secondary">
            {name}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

const ROLODEX_CONTACTS = [
  { initials: 'MW', name: 'Marcus Webb', role: 'Brand Director, Ogilvy' },
  { initials: 'PN', name: 'Priya Nair', role: 'Freelance UX Designer' },
  { initials: 'JO', name: 'James Okonkwo', role: 'Co-founder, Fieldwork Studio' },
];

function RolodexMockup() {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
      <div className="space-y-3 mb-4">
        {ROLODEX_CONTACTS.map((c) => (
          <div key={c.initials} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-surface-alt flex items-center justify-center shrink-0">
              <span className="font-body text-xs font-medium text-brand-text-muted">{c.initials}</span>
            </div>
            <div>
              <div className="font-body text-sm font-medium text-brand-text">{c.name}</div>
              <div className="font-body text-xs text-brand-text-muted">{c.role}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-brand-border
                         font-body text-xs font-medium text-brand-text-secondary
                         hover:bg-brand-surface-alt transition-colors duration-150">
        <QrCode className="w-3.5 h-3.5" />
        Scan QR to add contact
      </button>
    </div>
  );
}

function LayoutComparison() {
  return (
    <div className="flex items-end gap-4 justify-center">
      {/* Competitor: narrow phone layout */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-[100px] sm:w-[120px] rounded-xl border border-brand-border bg-brand-bg p-3 space-y-2"
        >
          <div className="w-8 h-8 rounded-full bg-brand-border mx-auto" />
          <div className="h-2 w-16 bg-brand-border rounded mx-auto" />
          <div className="h-1.5 w-12 bg-brand-border/60 rounded mx-auto" />
          <div className="space-y-1.5 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 rounded bg-brand-border/50" />
            ))}
          </div>
        </div>
        <span className="font-body text-[10px] text-brand-text-muted">Others</span>
      </div>

      {/* BytLinks: wide desktop layout */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-[180px] sm:w-[220px] rounded-xl border-2 border-brand-accent/30 bg-brand-bg p-3"
        >
          <div className="flex gap-3 mb-3">
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-brand-accent/15" />
              <div className="h-1.5 w-10 bg-brand-accent/20 rounded mt-1.5" />
            </div>
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-2 w-full bg-brand-border rounded" />
              <div className="h-1.5 w-3/4 bg-brand-border/60 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded bg-brand-accent/10 border border-brand-accent/20" />
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <div className="flex-1 h-5 rounded bg-brand-border/40" />
            <div className="flex-1 h-5 rounded bg-brand-border/40" />
          </div>
        </div>
        <span className="font-body text-[10px] font-semibold text-brand-accent">BytLinks</span>
      </div>
    </div>
  );
}

/* ── Main component ── */

interface FeaturePanel {
  label: string;
  heading: string;
  copy: string;
  visual: React.ReactNode;
  reverse?: boolean;
  cta?: boolean;
}

export function FeatureDeepDive() {
  const reduced = useReducedMotion() ?? false;

  const features: FeaturePanel[] = [
    {
      label: 'Privacy-first',
      heading: 'Analytics that don\'t spy',
      copy: 'Server-side tracking. No third-party scripts loading on your page. Your visitors aren\'t the product. You get views, clicks, countries, referrers, and top links — everything you need, nothing creepy. All included free.',
      visual: <AnalyticsMockup />,
    },
    {
      label: 'Content blocks',
      heading: '19 blocks. One page.',
      copy: 'Embed Spotify, sell products, collect emails, run polls, share files, display testimonials, schedule calls — all from drag-and-drop blocks. Most link-in-bio tools give you links. BytLinks gives you a real page.',
      visual: <BlockGrid reduced={reduced} />,
      reverse: true,
    },
    {
      label: 'Desktop-first',
      heading: 'A real website. Not a stretched phone screen.',
      copy: 'Your page uses a proper two-column desktop layout with distinct sections, not a narrow centered strip. When someone visits on a laptop, it feels like a real website — because it is one.',
      visual: <LayoutComparison />,
    },
    {
      label: 'For people who still go to places',
      heading: 'Your digital card. Their real contact.',
      copy: 'Share your card with a QR code at a conference. They scan it, see your links and details, save you to their Rolodex — no app download, no friction. You get their card back if they want to exchange. The only link-in-bio tool built for the room you\'re actually in.',
      visual: <RolodexMockup />,
      reverse: true,
      cta: true,
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        className="mb-16"
        initial={reduced ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
          What makes it different
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
          Four things you won't find elsewhere
        </h2>
      </motion.div>

      <div className="space-y-24 sm:space-y-32">
        {features.map((f) => (
          <div
            key={f.heading}
            className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
              f.reverse ? 'lg:[direction:rtl] lg:[&>*]:[direction:ltr]' : ''
            }`}
          >
            {/* Copy side */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, x: f.reverse ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent mb-2 block">
                {f.label}
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-700 tracking-tight text-brand-text mb-4">
                {f.heading}
              </h3>
              <p className="font-body text-sm sm:text-base text-brand-text-secondary leading-relaxed max-w-lg">
                {f.copy}
              </p>
              {f.cta && (
                <Link
                  to="/signup"
                  className="inline-block font-body text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150 mt-4"
                >
                  Try it free &rarr;
                </Link>
              )}
            </motion.div>

            {/* Visual side */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, x: f.reverse ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              {f.visual}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
