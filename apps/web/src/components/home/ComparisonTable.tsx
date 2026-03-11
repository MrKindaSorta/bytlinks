import { useState } from 'react';
import {
  Monitor, Palette, ShieldCheck, BarChart2, LayoutGrid,
  CreditCard, Users, DollarSign, Download, Upload,
} from 'lucide-react';
import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

const EASE = [0.25, 0.1, 0.25, 1] as const;

/** Amber for PARTIAL states — the only non-brand color in this component */
const PARTIAL_COLOR = '#b45309';

/* BytLinks column tint — expressed as color-mix because Tailwind can't do opacity on CSS vars.
   Used as inline style on header + all body cells in the BytLinks column. */
const BYTLINKS_COL_BG = 'color-mix(in srgb, var(--brand-accent) 8%, transparent)';

type CellStatus = 'true' | 'false' | 'partial' | 'count';

interface CellData {
  status: CellStatus;
  count?: string;
  note?: string;
}

interface ComparisonRow {
  feature: string;
  icon: LucideIcon;
  bytlinks: CellData;
  linktree: CellData;
  beacons: CellData;
  lnkbio: CellData;
}

const ROWS: ComparisonRow[] = [
  {
    feature: 'Desktop website layout',
    icon: Monitor,
    bytlinks: { status: 'true', note: '2-column grid on desktop — looks like a real site' },
    linktree: { status: 'false', note: 'Phone-width layout on all screens' },
    beacons: { status: 'false', note: 'Phone-width layout on all screens' },
    lnkbio: { status: 'false', note: 'Phone-width layout on all screens' },
  },
  {
    feature: 'All themes & styles, free',
    icon: Palette,
    bytlinks: { status: 'true', note: 'All 12 themes, 11 button styles, 8 fonts — free forever' },
    linktree: { status: 'false', note: 'Most themes require a paid plan' },
    beacons: { status: 'partial', note: 'Limited theme selection on free' },
    lnkbio: { status: 'partial', note: 'Basic styles only' },
  },
  {
    feature: 'Privacy-first analytics',
    icon: ShieldCheck,
    bytlinks: { status: 'true', note: 'Server-side only. No Google Analytics. No third-party scripts.' },
    linktree: { status: 'false', note: 'Requires Google Analytics for full data' },
    beacons: { status: 'false', note: 'Uses third-party tracking' },
    lnkbio: { status: 'false', note: 'Minimal analytics only' },
  },
  {
    feature: 'Full analytics on free plan',
    icon: BarChart2,
    bytlinks: { status: 'true', note: 'Views, clicks, countries, devices, referrers — all free' },
    linktree: { status: 'false', note: 'Detailed analytics on paid plans only' },
    beacons: { status: 'false', note: 'Real-time analytics on paid plans only' },
    lnkbio: { status: 'false', note: 'Basic click counts only' },
  },
  {
    feature: 'Content block types',
    icon: LayoutGrid,
    bytlinks: { status: 'count', count: '19 types', note: '7 free · 19 on Pro' },
    linktree: { status: 'count', count: '~6 types', note: 'Links, text, video, music, form, social' },
    beacons: { status: 'count', count: '~8 types', note: 'Links, store, embeds, text, forms, and more' },
    lnkbio: { status: 'count', count: '~4 types', note: 'Links, separators, embeds, buttons' },
  },
  {
    feature: 'Digital business card + QR',
    icon: CreditCard,
    bytlinks: { status: 'true', note: 'Up to 3 cards, QR code, vCard download, private token URL' },
    linktree: { status: 'partial', note: 'QR code only — no card system' },
    beacons: { status: 'false', note: 'Physical NFC card on $90/month plan only' },
    lnkbio: { status: 'false' },
  },
  {
    feature: 'Contact Rolodex',
    icon: Users,
    bytlinks: { status: 'true', note: 'Scan, save, and exchange cards with other users' },
    linktree: { status: 'false' },
    beacons: { status: 'false' },
    lnkbio: { status: 'false' },
  },
  {
    feature: 'Zero transaction fees',
    icon: DollarSign,
    bytlinks: { status: 'true', note: 'BytLinks never takes a cut of anything' },
    linktree: { status: 'partial', note: 'Fees apply on digital product sales' },
    beacons: { status: 'false', note: '9% fee on Free and $10/month plans' },
    lnkbio: { status: 'true' },
  },
  {
    feature: 'Import from competitors',
    icon: Download,
    bytlinks: { status: 'true', note: 'Import from Linktree or CSV — takes 30 seconds' },
    linktree: { status: 'false' },
    beacons: { status: 'false' },
    lnkbio: { status: 'false' },
  },
  {
    feature: 'Full data export',
    icon: Upload,
    bytlinks: { status: 'true', note: 'Export everything as JSON or CSV, any time, free' },
    linktree: { status: 'false' },
    beacons: { status: 'false', note: 'No full account export' },
    lnkbio: { status: 'false' },
  },
];

/* ── Tooltip ── */

function Tooltip({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg
                 text-white text-xs text-center max-w-[200px] z-50 pointer-events-none
                 transition-opacity duration-150"
      style={{
        backgroundColor: 'var(--brand-text)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        opacity: visible ? 1 : 0,
      }}
    >
      {text}
    </div>
  );
}

/* ── Status cell ── */

function StatusCell({ data, isBytlinks }: { data: CellData; isBytlinks?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const showTooltipAlways = hovered && data.note && (data.status === 'partial' || data.status === 'count');

  if (data.status === 'true') {
    return (
      <div
        className="relative flex justify-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {!isBytlinks && data.note && <Tooltip text={data.note} visible={hovered} />}
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)' }}
        >
          <Check className="w-3 h-3 text-brand-accent" />
        </div>
      </div>
    );
  }

  if (data.status === 'false') {
    return (
      <div
        className="relative flex justify-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {data.note && <Tooltip text={data.note} visible={hovered} />}
        <span className="text-brand-text-muted">—</span>
      </div>
    );
  }

  if (data.status === 'partial') {
    return (
      <div
        className="relative flex flex-col items-center gap-0.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {data.note && <Tooltip text={data.note} visible={showTooltipAlways || false} />}
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${PARTIAL_COLOR} 15%, transparent)` }}
        >
          <span className="text-xs font-medium" style={{ color: PARTIAL_COLOR }}>~</span>
        </div>
      </div>
    );
  }

  /* count */
  return (
    <div
      className="relative flex justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {data.note && <Tooltip text={data.note} visible={showTooltipAlways || false} />}
      {isBytlinks ? (
        <span className="inline-block bg-brand-accent text-white text-xs font-medium px-2 py-0.5 rounded-full">
          {data.count}
        </span>
      ) : (
        <span className="inline-block bg-brand-surface-alt text-brand-text-secondary text-xs px-2 py-0.5 rounded-full border border-brand-border">
          {data.count}
        </span>
      )}
    </div>
  );
}

/* ── Main component ── */

export function ComparisonTable() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="py-24 bg-brand-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-12"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
            How we compare
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text mb-3">
            Built different. Priced honestly.
          </h2>
          <p className="font-body text-base text-brand-text-secondary max-w-xl mx-auto">
            Every competitor charges more for less.
            We give you the full toolkit free, and charge only for the blocks that power pros.
          </p>
        </motion.div>

        <motion.div
          className="rounded-2xl overflow-hidden border border-brand-border"
          initial={reduced ? undefined : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {/* Header */}
          <div className="bg-brand-surface-alt border-b-2 border-brand-border">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-[40%] text-left px-4 sm:px-6 py-3">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th
                    className="w-[15%] text-center px-2 py-3 font-display text-sm font-bold text-brand-accent border-t-[3px] border-brand-accent"
                    style={{ background: BYTLINKS_COL_BG }}
                  >
                    BytLinks
                  </th>
                  <th className="w-[15%] text-center px-2 py-3 font-body text-sm font-medium text-brand-text-secondary">
                    Linktree
                  </th>
                  <th className="w-[15%] text-center px-2 py-3 font-body text-sm font-medium text-brand-text-secondary">
                    Beacons
                  </th>
                  <th className="w-[15%] text-center px-2 py-3 font-body text-sm font-medium text-brand-text-secondary hidden md:table-cell">
                    Lnk.Bio
                  </th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Body */}
          <table className="w-full">
            <tbody>
              {ROWS.map((row, idx) => {
                const Icon = row.icon;
                const isLast = idx === ROWS.length - 1;
                return (
                  <tr
                    key={row.feature}
                    className="group"
                  >
                    <td
                      className={`w-[40%] px-4 sm:px-6 py-4 group-hover:bg-brand-surface-alt/60 transition-colors duration-100
                        ${isLast ? '' : 'border-b border-brand-border'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-brand-text-muted shrink-0" />
                        <span className="font-body text-sm font-medium text-brand-text hidden sm:inline">{row.feature}</span>
                      </div>
                    </td>
                    <td
                      className={`w-[15%] px-2 py-4 transition-colors duration-100
                        ${isLast ? '' : 'border-b border-brand-border'}`}
                      style={{ background: BYTLINKS_COL_BG }}
                    >
                      <StatusCell data={row.bytlinks} isBytlinks />
                    </td>
                    <td
                      className={`w-[15%] px-2 py-4 group-hover:bg-brand-surface-alt/60 transition-colors duration-100
                        ${isLast ? '' : 'border-b border-brand-border'}`}
                    >
                      <StatusCell data={row.linktree} />
                    </td>
                    <td
                      className={`w-[15%] px-2 py-4 group-hover:bg-brand-surface-alt/60 transition-colors duration-100
                        ${isLast ? '' : 'border-b border-brand-border'}`}
                    >
                      <StatusCell data={row.beacons} />
                    </td>
                    <td
                      className={`w-[15%] px-2 py-4 group-hover:bg-brand-surface-alt/60 transition-colors duration-100 hidden md:table-cell
                        ${isLast ? '' : 'border-b border-brand-border'}`}
                    >
                      <StatusCell data={row.lnkbio} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        <p className="font-body text-xs text-brand-text-muted text-center mt-6">
          Feature data based on publicly available plan information as of 2025.
          Some competitor features vary by plan or region.
        </p>
      </div>
    </section>
  );
}
