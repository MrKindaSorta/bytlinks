const ranges = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

export function AdminDateRangePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-brand-border overflow-hidden">
      {ranges.map(({ label, days }) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={`px-2.5 py-1 font-body text-[11px] font-medium transition-colors ${
            value === days
              ? 'bg-brand-accent text-white'
              : 'text-brand-text-muted hover:bg-brand-surface-alt'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
