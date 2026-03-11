import { Check, Minus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.25, 0.1, 0.25, 1] as const;

type CellStatus = 'yes' | 'no' | 'partial';

interface ComparisonRow {
  feature: string;
  bytlinks: CellStatus;
  linktree: CellStatus;
  beacons: CellStatus;
  bytlinksNote?: string;
  linktreeNote?: string;
  beaconsNote?: string;
}

const ROWS: ComparisonRow[] = [
  {
    feature: 'All themes free',
    bytlinks: 'yes',
    linktree: 'no',
    beacons: 'partial',
    beaconsNote: 'Limited',
  },
  {
    feature: 'Desktop two-column layout',
    bytlinks: 'yes',
    linktree: 'no',
    beacons: 'no',
  },
  {
    feature: 'Built-in analytics (free)',
    bytlinks: 'yes',
    linktree: 'partial',
    beacons: 'yes',
    linktreeNote: 'Basic only',
  },
  {
    feature: 'Server-side tracking (no 3rd-party scripts)',
    bytlinks: 'yes',
    linktree: 'no',
    beacons: 'no',
  },
  {
    feature: 'Custom fonts & button styles',
    bytlinks: 'yes',
    linktree: 'partial',
    beacons: 'yes',
    linktreeNote: 'Pro only',
  },
  {
    feature: 'Custom domain',
    bytlinks: 'partial',
    linktree: 'partial',
    beacons: 'partial',
    bytlinksNote: 'Pro only',
    linktreeNote: 'Pro only',
    beaconsNote: 'Paid',
  },
  {
    feature: '19 content block types',
    bytlinks: 'yes',
    linktree: 'no',
    beacons: 'partial',
    beaconsNote: 'Some',
  },
  {
    feature: 'Page loads under 1 second',
    bytlinks: 'yes',
    linktree: 'partial',
    beacons: 'no',
    linktreeNote: 'Varies',
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const rowVariant = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

function StatusCell({ status, note }: { status: CellStatus; note?: string }) {
  if (status === 'yes') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-5 h-5 rounded-full bg-brand-accent/15 flex items-center justify-center">
          <Check className="w-3 h-3 text-brand-accent" />
        </div>
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-5 h-5 rounded-full bg-brand-warning/15 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-brand-warning" />
        </div>
        {note && <span className="font-body text-[9px] text-brand-text-muted">{note}</span>}
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <Minus className="w-4 h-4 text-brand-text-muted/30" />
    </div>
  );
}

export function ComparisonTable() {
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
            The difference
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
            Most link pages are an afterthought.
            <br className="hidden sm:block" />
            <span className="text-brand-accent"> BytLinks is the point.</span>
          </h2>
        </motion.div>

        <motion.div
          className="rounded-xl border border-brand-border overflow-hidden"
          variants={reduced ? undefined : container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] bg-brand-bg border-b border-brand-border px-4 sm:px-6 py-3 gap-4 sm:gap-6">
            <div />
            <div className="font-display text-xs sm:text-sm font-700 text-brand-accent w-16 sm:w-24 text-center">BytLinks</div>
            <div className="font-body text-xs sm:text-sm text-brand-text-muted w-16 sm:w-24 text-center">Linktree</div>
            <div className="font-body text-xs sm:text-sm text-brand-text-muted w-16 sm:w-24 text-center">Beacons</div>
          </div>

          {/* Rows */}
          {ROWS.map((row) => (
            <motion.div
              key={row.feature}
              variants={reduced ? undefined : rowVariant}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 sm:px-6 py-4 gap-4 sm:gap-6
                         border-b last:border-0 border-brand-border bg-brand-surface
                         hover:bg-brand-surface-alt transition-colors duration-150"
            >
              <p className="font-body text-sm text-brand-text-secondary">{row.feature}</p>
              <div className="w-16 sm:w-24 flex justify-center">
                <StatusCell status={row.bytlinks} note={row.bytlinksNote} />
              </div>
              <div className="w-16 sm:w-24 flex justify-center">
                <StatusCell status={row.linktree} note={row.linktreeNote} />
              </div>
              <div className="w-16 sm:w-24 flex justify-center">
                <StatusCell status={row.beacons} note={row.beaconsNote} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
