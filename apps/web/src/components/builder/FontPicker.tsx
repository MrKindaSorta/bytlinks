import type { FontPair, BaseStyle } from '@bytlinks/shared';
import { STYLE_DEFAULTS } from '../../utils/styleDefaults';

const FONT_PAIRS: { key: FontPair; display: string; body: string; displayFont: string; bodyFont: string }[] = [
  { key: 'mono-serif', display: 'JetBrains Mono', body: 'Lora', displayFont: "'JetBrains Mono', monospace", bodyFont: "'Lora', serif" },
  { key: 'editorial', display: 'Playfair Display', body: 'Source Sans 3', displayFont: "'Playfair Display', serif", bodyFont: "'Source Sans 3', sans-serif" },
  { key: 'grotesque', display: 'Cabinet Grotesk', body: 'DM Sans', displayFont: "'Cabinet Grotesk', sans-serif", bodyFont: "'DM Sans', sans-serif" },
  { key: 'slab', display: 'Zilla Slab', body: 'IBM Plex Sans', displayFont: "'Zilla Slab', serif", bodyFont: "'IBM Plex Sans', sans-serif" },
  { key: 'humanist', display: 'Nunito', body: 'Nunito Sans', displayFont: "'Nunito', sans-serif", bodyFont: "'Nunito Sans', sans-serif" },
  { key: 'condensed', display: 'Barlow Condensed', body: 'Barlow', displayFont: "'Barlow Condensed', sans-serif", bodyFont: "'Barlow', sans-serif" },
  { key: 'geometric', display: 'Outfit', body: 'Outfit', displayFont: "'Outfit', sans-serif", bodyFont: "'Outfit', sans-serif" },
  { key: 'retro', display: 'Syne', body: 'Syne', displayFont: "'Syne', sans-serif", bodyFont: "'Syne', sans-serif" },
];

interface FontPickerProps {
  value: FontPair | 'style-default';
  baseStyle: BaseStyle;
  onChange: (pair: FontPair | 'style-default') => void;
}

export function FontPicker({ value, baseStyle, onChange }: FontPickerProps) {
  const isStyleDefault = value === 'style-default';
  const resolvedDefault = STYLE_DEFAULTS[baseStyle].fontPair;
  const resolvedPair = FONT_PAIRS.find((p) => p.key === resolvedDefault);

  return (
    <div className="space-y-3">
      {/* Style default toggle */}
      <button
        onClick={() => onChange('style-default')}
        className={`flex items-center gap-3 w-full rounded-xl border p-3 text-left transition-colors duration-fast
          ${isStyleDefault
            ? 'border-brand-accent ring-2 ring-brand-accent/20'
            : 'border-brand-border hover:border-brand-text-muted'
          }`}
      >
        {resolvedPair && (
          <p
            className="text-lg font-bold tracking-tight leading-tight text-brand-text shrink-0"
            style={{ fontFamily: resolvedPair.displayFont }}
          >
            Aa
          </p>
        )}
        <div>
          <p className="font-body text-xs font-semibold text-brand-text">Style default</p>
          <p className="font-body text-[10px] text-brand-text-muted">
            {resolvedPair ? `${resolvedPair.display} + ${resolvedPair.body}` : resolvedDefault}
          </p>
        </div>
      </button>

      {/* Manual options */}
      <div className="grid grid-cols-2 gap-2">
        {FONT_PAIRS.map((pair) => (
          <button
            key={pair.key}
            onClick={() => onChange(pair.key)}
            className={`rounded-xl border p-3 text-left transition-colors duration-fast
              ${!isStyleDefault && value === pair.key
                ? 'border-brand-accent ring-2 ring-brand-accent/20'
                : 'border-brand-border hover:border-brand-text-muted'
              }`}
          >
            <p
              className="text-lg font-bold tracking-tight leading-tight text-brand-text mb-0.5"
              style={{ fontFamily: pair.displayFont }}
            >
              Aa
            </p>
            <p
              className="text-[10px] text-brand-text-muted leading-tight"
              style={{ fontFamily: pair.bodyFont }}
            >
              {pair.display} + {pair.body}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
