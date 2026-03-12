import { useState } from 'react';
import type { HeatmapCell } from '../../hooks/useAdminAnalytics';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function AdminHourlyHeatmap({ data }: { data: HeatmapCell[] }) {
  const [tooltip, setTooltip] = useState<{ dow: number; hour: number; count: number; x: number; y: number } | null>(null);

  // Build lookup
  const lookup = new Map<string, number>();
  let maxCount = 1;
  for (const cell of data) {
    const key = `${cell.dow}-${cell.hour}`;
    lookup.set(key, cell.count);
    if (cell.count > maxCount) maxCount = cell.count;
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Traffic Heatmap
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Hour labels */}
          <div className="flex ml-10 mb-1">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center font-body text-[9px] text-brand-text-muted">
                {h % 3 === 0 ? `${h}` : ''}
              </div>
            ))}
          </div>

          {/* Grid */}
          {dayLabels.map((dayLabel, dow) => (
            <div key={dow} className="flex items-center gap-1 mb-0.5">
              <span className="w-9 text-right font-body text-[10px] text-brand-text-muted shrink-0">
                {dayLabel}
              </span>
              <div className="flex flex-1 gap-px">
                {hours.map((hour) => {
                  const count = lookup.get(`${dow}-${hour}`) ?? 0;
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square rounded-sm cursor-pointer transition-opacity"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--color-brand-accent, #10b981) ${Math.round(intensity * 100)}%, var(--color-brand-surface-alt, #f3f4f6))`,
                        minHeight: '12px',
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ dow, hour, count, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <span className="font-body text-[9px] text-brand-text-muted">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((level) => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-brand-accent, #10b981) ${Math.round(level * 100)}%, var(--color-brand-surface-alt, #f3f4f6))`,
                }}
              />
            ))}
            <span className="font-body text-[9px] text-brand-text-muted">More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-brand-text text-brand-bg font-body text-[11px] pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 4 }}
        >
          {dayLabels[tooltip.dow]} {tooltip.hour}:00 — {tooltip.count.toLocaleString()} views
        </div>
      )}
    </div>
  );
}
