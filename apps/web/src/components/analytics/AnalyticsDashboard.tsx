import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { AnalyticsAnimProvider } from './AnalyticsContext';
import { PageAnalyticsTab } from './PageAnalyticsTab';
import { BlockAnalyticsTab } from './BlockAnalyticsTab';
import { RefreshCw, Check } from 'lucide-react';

type RefreshPhase = 'idle' | 'spinning' | 'done';
const PHASE_LABELS: Record<RefreshPhase, string> = {
  idle: 'Refresh',
  spinning: 'Refreshing',
  done: 'Updated',
};
const FADE_OUT_MS = 250;
const CHAR_STAGGER_MS = 30;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Tab = 'page' | 'blocks';

export function AnalyticsDashboard() {
  const { data, loading, refetch } = useAnalytics();
  const [countUpKey, setCountUpKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<RefreshPhase>('idle');
  const [tab, setTab] = useState<Tab>('page');
  const initialLoadDone = useRef(false);

  // Trigger count-up after initial data load
  useEffect(() => {
    if (!loading && !initialLoadDone.current && data.overview) {
      initialLoadDone.current = true;
      setCountUpKey(1);
    }
  }, [loading, data.overview]);

  const handleRefresh = useCallback(async () => {
    if (phase !== 'idle') return;

    // Immediately: reset numbers, show spinners, start button animation
    setCountUpKey(0);
    setRefreshing(true);
    setPhase('spinning');

    // Fetch data — enforce minimum 1.5s so spinners feel intentional
    await Promise.all([refetch(), wait(1500)]);

    // 500ms pause to let the spinning phase breathe
    await wait(500);

    // Reveal results: spinners out, numbers count up, button → "Updated"
    setRefreshing(false);
    setPhase('done');
    setCountUpKey((k) => k + 1);

    // Hold "Updated" for a comfortable read
    await wait(2000);

    // Ease back to idle
    setPhase('idle');
  }, [phase, refetch]);

  const animValue = useMemo(
    () => ({ countUpKey, refreshing }),
    [countUpKey, refreshing],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = data.overview && data.overview.total_views > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-10 text-center">
        <p className="font-display text-lg font-700 text-brand-text mb-2">
          No analytics yet
        </p>
        <p className="font-body text-sm text-brand-text-muted">
          Share your page to start seeing traffic data here.
        </p>
      </div>
    );
  }

  return (
    <AnalyticsAnimProvider value={animValue}>
      {/* Header row: tab bar + refresh */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Tab pills */}
          <div className="relative flex rounded-full bg-brand-surface-raised p-0.5">
            {/* Sliding background pill */}
            <span
              className="absolute top-0.5 bottom-0.5 rounded-full bg-brand-surface border border-brand-border transition-transform duration-200"
              style={{
                width: '50%',
                transform: tab === 'page' ? 'translateX(0)' : 'translateX(100%)',
              }}
            />
            <button
              onClick={() => setTab('page')}
              className={`relative z-10 font-body text-xs font-medium px-3 py-1.5 rounded-full transition-colors duration-150 ${
                tab === 'page' ? 'text-brand-text' : 'text-brand-text-muted'
              }`}
            >
              Page Analytics
            </button>
            <button
              onClick={() => setTab('blocks')}
              className={`relative z-10 font-body text-xs font-medium px-3 py-1.5 rounded-full transition-colors duration-150 ${
                tab === 'blocks' ? 'text-brand-text' : 'text-brand-text-muted'
              }`}
            >
              Block Analytics
            </button>
          </div>

          <p className="font-body text-xs text-brand-text-muted hidden sm:block">Last 30 days</p>
        </div>
        <RefreshButton phase={phase} onClick={handleRefresh} />
      </div>

      {/* Tab content */}
      {tab === 'page' && <PageAnalyticsTab data={data} />}
      {tab === 'blocks' && <BlockAnalyticsTab data={data} />}
    </AnalyticsAnimProvider>
  );
}

/**
 * Refresh button with smooth crossfade + typing transitions.
 * Each phase transition includes a text fade-out → type-in cycle.
 * Ring orbits the pill border during spinning, fills on done, fades to idle.
 */
function RefreshButton({ phase, onClick }: { phase: RefreshPhase; onClick: () => void }) {
  const [displayPhase, setDisplayPhase] = useState<RefreshPhase>('idle');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (phase === displayPhase) return;
    setFading(true);
    const t = setTimeout(() => {
      setDisplayPhase(phase);
      setFading(false);
    }, FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [phase, displayPhase]);

  const label = PHASE_LABELS[displayPhase];
  const showRing = phase === 'spinning' || phase === 'done';

  return (
    <button
      onClick={onClick}
      disabled={phase !== 'idle'}
      className="relative flex items-center gap-1.5 font-body text-xs font-medium
                 px-3 py-1.5 rounded-full
                 text-brand-text-secondary hover:text-brand-text
                 transition-colors duration-fast
                 disabled:pointer-events-none"
    >
      {/* Ring container */}
      <span
        className={`absolute inset-0 rounded-full overflow-hidden ${
          showRing ? 'opacity-100' : 'opacity-0'
        } ${phase === 'done' ? 'analytics-ring-done' : ''}`}
        style={{
          transition: 'opacity 0.5s ease',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1.5px',
        }}
      >
        <span
          className={`absolute inset-[-50%] ${phase === 'spinning' ? 'analytics-ring-spin' : ''}`}
          style={{
            background:
              phase === 'done'
                ? 'var(--color-brand-accent, #10b981)'
                : 'conic-gradient(from 0deg, transparent 0%, transparent 55%, var(--color-brand-accent, #10b981) 100%)',
          }}
        />
      </span>

      {/* Icon */}
      <span className="relative z-10 w-3.5 h-3.5 flex-shrink-0">
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            fading ? 'opacity-0' : 'opacity-100'
          } ${displayPhase === 'spinning' ? 'analytics-icon-spin' : ''}`}
        >
          {displayPhase === 'done' ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 analytics-icon-done" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </span>
      </span>

      {/* Label — fades out, then types in char-by-char */}
      <span
        className="relative z-10 inline-flex overflow-hidden"
        style={{
          transition: `opacity ${FADE_OUT_MS}ms ease`,
          opacity: fading ? 0 : 1,
        }}
      >
        <span key={displayPhase} className="inline-flex">
          {label.split('').map((char, i) => (
            <span
              key={i}
              className="analytics-char-in"
              style={{ animationDelay: `${i * CHAR_STAGGER_MS}ms` }}
            >
              {char}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
