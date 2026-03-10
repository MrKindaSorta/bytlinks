import type { ButtonStyle, BaseStyle } from '@bytlinks/shared';
import { STYLE_DEFAULTS } from '../../utils/styleDefaults';

const BUTTON_STYLES: { key: ButtonStyle; label: string }[] = [
  { key: 'filled', label: 'Filled' },
  { key: 'outline', label: 'Outline' },
  { key: 'outline-sharp', label: 'Sharp' },
  { key: 'pill', label: 'Pill' },
  { key: 'pill-outline', label: 'Pill Outline' },
  { key: 'underline', label: 'Underline' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'brutalist', label: 'Brutalist' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'soft', label: 'Soft' },
];

function getButtonPreviewStyle(style: ButtonStyle): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 32,
    fontSize: 11,
    fontWeight: 600,
    transition: 'background 150ms, color 150ms, border-color 150ms',
  };

  switch (style) {
    case 'filled': return { ...base, background: '#1c1917', color: '#fff', borderRadius: 8 };
    case 'outline': return { ...base, background: 'transparent', color: '#1c1917', border: '1.5px solid #1c1917', borderRadius: 8 };
    case 'outline-sharp': return { ...base, background: 'transparent', color: '#1c1917', border: '1.5px solid #1c1917', borderRadius: 0 };
    case 'pill': return { ...base, background: '#1c1917', color: '#fff', borderRadius: 999 };
    case 'pill-outline': return { ...base, background: 'transparent', color: '#1c1917', border: '1.5px solid #1c1917', borderRadius: 999 };
    case 'underline': return { ...base, background: 'transparent', color: '#1c1917', borderBottom: '2px solid #1c1917', borderRadius: 0 };
    case 'ghost': return { ...base, background: 'rgba(28,25,23,0.06)', color: '#1c1917', borderRadius: 8 };
    case 'shadow': return { ...base, background: '#1c1917', color: '#fff', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' };
    case 'brutalist': return { ...base, background: '#1c1917', color: '#fff', borderRadius: 0, boxShadow: '3px 3px 0 #1c1917', border: '2px solid #1c1917' };
    case 'gradient': return { ...base, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff', borderRadius: 8 };
    case 'soft': return { ...base, background: 'rgba(13,148,136,0.12)', color: '#0d9488', borderRadius: 12 };
  }
}

interface ButtonStylePickerProps {
  value: ButtonStyle | 'style-default';
  baseStyle: BaseStyle;
  onChange: (style: ButtonStyle | 'style-default') => void;
}

export function ButtonStylePicker({ value, baseStyle, onChange }: ButtonStylePickerProps) {
  const isStyleDefault = value === 'style-default';
  const resolvedDefault = STYLE_DEFAULTS[baseStyle].buttonStyle;

  return (
    <div className="space-y-3">
      {/* Style default toggle */}
      <button
        onClick={() => onChange('style-default')}
        className={`flex items-center gap-2.5 w-full rounded-xl border p-3 text-left transition-colors duration-fast
          ${isStyleDefault
            ? 'border-brand-accent ring-2 ring-brand-accent/20'
            : 'border-brand-border hover:border-brand-text-muted'
          }`}
      >
        <div className="w-16 shrink-0">
          <div style={{ ...getButtonPreviewStyle(resolvedDefault), width: '100%' }}>Link</div>
        </div>
        <div>
          <p className="font-body text-xs font-semibold text-brand-text">Style default</p>
          <p className="font-body text-[10px] text-brand-text-muted">
            {BUTTON_STYLES.find((s) => s.key === resolvedDefault)?.label}
          </p>
        </div>
      </button>

      {/* Manual options */}
      <div className="grid grid-cols-3 gap-2">
        {BUTTON_STYLES.map((style) => (
          <button
            key={style.key}
            onClick={() => onChange(style.key)}
            className={`rounded-xl border p-2.5 transition-colors duration-fast
              ${!isStyleDefault && value === style.key
                ? 'border-brand-accent ring-2 ring-brand-accent/20'
                : 'border-brand-border hover:border-brand-text-muted'
              }`}
          >
            <div style={getButtonPreviewStyle(style.key)}>Link</div>
            <p className="font-body text-[10px] text-brand-text-muted mt-1.5 text-center">{style.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
