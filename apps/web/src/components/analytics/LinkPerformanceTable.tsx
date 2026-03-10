import { ExternalLink } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useCountUpKey, useRefreshing } from './AnalyticsContext';
import { TileSpinner } from './TileSpinner';

interface LinkData {
  id: string;
  title: string;
  url: string;
  clicks: number;
  ctr: number;
}

function AnimatedClicks({ value, delay }: { value: number; delay: number }) {
  const key = useCountUpKey();
  const animated = useCountUp(value, key, 1200, delay);
  return <>{animated}</>;
}

function AnimatedCtr({ value, delay }: { value: number; delay: number }) {
  const key = useCountUpKey();
  const raw = Math.round(value * 10);
  const animated = useCountUp(raw, key, 1200, delay);
  return <>{(animated / 10).toFixed(1)}%</>;
}

export function LinkPerformanceTable({ links }: { links: LinkData[] }) {
  if (links.length === 0) return null;

  const refreshing = useRefreshing();

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 relative overflow-hidden">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Link Performance
      </h3>

      <div style={{ opacity: refreshing ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide text-left pb-2 pr-4">
                  Link
                </th>
                <th className="font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide text-right pb-2 px-3 w-20">
                  Clicks
                </th>
                <th className="font-body text-[11px] font-medium text-brand-text-muted uppercase tracking-wide text-right pb-2 pl-3 w-16">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, i) => (
                <tr
                  key={link.id}
                  className={i < links.length - 1 ? 'border-b border-brand-border/50' : ''}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-body text-xs font-medium text-brand-text truncate">
                        {link.title}
                      </span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-text-muted hover:text-brand-text flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-display text-sm font-700 text-brand-text tabular-nums">
                      <AnimatedClicks value={link.clicks} delay={i * 80} />
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <span className="font-body text-xs text-brand-text-muted tabular-nums">
                      <AnimatedCtr value={link.ctr} delay={i * 80} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {refreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileSpinner />
        </div>
      )}
    </div>
  );
}
