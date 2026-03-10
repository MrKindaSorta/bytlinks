import { useLinks } from '../../hooks/useLinks';
import { X, RotateCcw } from 'lucide-react';
import type { ButtonStyle, LinkStyleOverride } from '@bytlinks/shared';

/* ── Theme color context for accurate previews ── */

export interface ThemeColorContext {
  pageBg: string;
  pageText: string;
  accent: string;
  surfaceAlt: string;
  btnBg: string;
  btnText: string;
}

/* ── Button style visual previews ── */

const BUTTON_STYLES: { key: ButtonStyle; label: string }[] = [
  { key: 'filled', label: 'Filled' },
  { key: 'outline', label: 'Outline' },
  { key: 'outline-sharp', label: 'Sharp' },
  { key: 'pill', label: 'Pill' },
  { key: 'pill-outline', label: 'Pill Out.' },
  { key: 'underline', label: 'Underline' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'brutalist', label: 'Brutalist' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'soft', label: 'Soft' },
];

/** Safely convert a hex color to rgba. Returns the color unchanged if not a valid hex. */
function hexToRgba(color: string, alpha: number): string {
  if (!color.startsWith('#') || color.length < 7) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return color;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Format a color for display — shows hex uppercase, or the raw value for non-hex. */
function formatColor(color: string): string {
  if (color.startsWith('#')) return color.toUpperCase();
  return color;
}

function getButtonPreviewStyle(style: ButtonStyle, c: ThemeColorContext): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 28,
    fontSize: 10,
    fontWeight: 600,
  };
  switch (style) {
    case 'filled':
      return { ...base, background: c.btnBg, color: c.btnText, borderRadius: 6 };
    case 'outline':
      return { ...base, background: 'transparent', color: c.pageText, border: `1.5px solid ${c.pageText}`, borderRadius: 6 };
    case 'outline-sharp':
      return { ...base, background: 'transparent', color: c.pageText, border: `1.5px solid ${c.pageText}`, borderRadius: 0 };
    case 'pill':
      return { ...base, background: c.btnBg, color: c.btnText, borderRadius: 999 };
    case 'pill-outline':
      return { ...base, background: 'transparent', color: c.pageText, border: `1.5px solid ${c.pageText}`, borderRadius: 999 };
    case 'underline':
      return { ...base, background: 'transparent', color: c.pageText, borderBottom: `2px solid ${c.accent}`, borderRadius: 0 };
    case 'ghost':
      return { ...base, background: hexToRgba(c.btnBg, 0.08), color: c.pageText, borderRadius: 6 };
    case 'shadow':
      return { ...base, background: c.btnBg, color: c.btnText, borderRadius: 6, boxShadow: '0 3px 8px rgba(0,0,0,0.25)' };
    case 'brutalist':
      return { ...base, background: c.btnBg, color: c.btnText, borderRadius: 0, boxShadow: `2px 2px 0 ${c.pageText}`, border: `1.5px solid ${c.pageText}` };
    case 'gradient':
      return { ...base, background: `linear-gradient(135deg, ${c.accent}, ${c.btnBg})`, color: c.btnText, borderRadius: 6 };
    case 'soft':
      return { ...base, background: hexToRgba(c.accent, 0.12), color: c.accent, borderRadius: 10 };
  }
}

/* ── Quick-pick color swatches ── */

const BUTTON_COLOR_SWATCHES = [
  '#1c1917', '#ffffff', '#0d9488', '#38bdf8', '#c084fc',
  '#f97316', '#4ade80', '#e879a0', '#f87171', '#06b6d4',
  '#475569', '#a67b5b', '#6b8f3c', '#a1a1aa', '#0ea5e9',
];

const TEXT_COLOR_SWATCHES = [
  '#ffffff', '#1c1917', '#f8fafc', '#e2e8f0', '#334155',
  '#0d9488', '#f97316', '#c084fc', '#f87171', '#4ade80',
];

/* ── Component ── */

interface LinkOverrideEditorProps {
  linkId: string;
  onClose: () => void;
  globalButtonStyle: ButtonStyle;
  themeColors: ThemeColorContext;
}

export function LinkOverrideEditor({
  linkId,
  onClose,
  globalButtonStyle,
  themeColors,
}: LinkOverrideEditorProps) {
  const { links, editLink } = useLinks();
  const link = links.find((l) => l.id === linkId);

  if (!link) return null;

  const overrides: LinkStyleOverride = link.style_overrides ?? {};
  const hasAnyOverride = !!(overrides.buttonStyle || overrides.buttonBg || overrides.buttonText);

  function updateOverrides(updates: Partial<LinkStyleOverride>) {
    const merged = { ...overrides, ...updates };
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== null && v !== '') cleaned[k] = v as string;
    }
    const hasValues = Object.keys(cleaned).length > 0;
    editLink(linkId, { style_overrides: hasValues ? (cleaned as unknown as LinkStyleOverride) : null }).catch(() => {});
  }

  function resetOverrides() {
    editLink(linkId, { style_overrides: null }).catch(() => {});
  }

  // Effective values (override > theme)
  const effectiveBg = overrides.buttonBg ?? themeColors.btnBg;
  const effectiveText = overrides.buttonText ?? themeColors.btnText;

  const defaultLabel = BUTTON_STYLES.find((s) => s.key === globalButtonStyle)?.label ?? globalButtonStyle;

  return (
    <div className="rounded-xl border border-brand-accent/20 bg-brand-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-brand-border">
        <div className="min-w-0">
          <p className="font-body text-[10px] font-medium text-brand-accent uppercase tracking-[0.08em]">
            Customize Link
          </p>
          <p className="font-body text-sm font-semibold text-brand-text truncate">
            {link.title}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          {hasAnyOverride && (
            <button
              onClick={resetOverrides}
              className="flex items-center gap-1 px-2 py-1 rounded-md font-body text-[10px] font-medium
                         text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-alt
                         transition-colors duration-150"
              title="Reset all overrides to theme defaults"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-brand-text-muted hover:text-brand-text
                       hover:bg-brand-surface-alt transition-colors duration-150"
            aria-label="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Button Shape ── */}
      <div className="px-4 pt-4 pb-3 border-b border-brand-border">
        <p className="font-body text-xs font-medium text-brand-text mb-2.5">Button Shape</p>

        {/* Theme default option */}
        <button
          onClick={() => updateOverrides({ buttonStyle: undefined })}
          className={`flex items-center gap-3 w-full rounded-lg border overflow-hidden p-2 mb-2 text-left
            transition-colors duration-150
            ${!overrides.buttonStyle
              ? 'border-brand-accent ring-1 ring-brand-accent/20'
              : 'border-brand-border hover:border-brand-text-muted'
            }`}
        >
          <div className="w-14 shrink-0 rounded p-1" style={{ backgroundColor: themeColors.pageBg }}>
            <div style={getButtonPreviewStyle(globalButtonStyle, themeColors)}>Link</div>
          </div>
          <div className="min-w-0">
            <p className="font-body text-xs font-semibold text-brand-text">Theme default</p>
            <p className="font-body text-[10px] text-brand-text-muted">{defaultLabel}</p>
          </div>
        </button>

        {/* Style grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {BUTTON_STYLES.map((style) => (
            <button
              key={style.key}
              onClick={() => updateOverrides({ buttonStyle: style.key })}
              className={`rounded-lg border overflow-hidden transition-colors duration-150
                ${overrides.buttonStyle === style.key
                  ? 'border-brand-accent ring-1 ring-brand-accent/20'
                  : 'border-brand-border hover:border-brand-text-muted'
                }`}
            >
              <div className="px-1.5 pt-1.5 pb-1" style={{ backgroundColor: themeColors.pageBg }}>
                <div style={getButtonPreviewStyle(style.key, themeColors)}>Link</div>
              </div>
              <p className="font-body text-[10px] text-brand-text-muted py-1 text-center bg-brand-surface">
                {style.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Button Color ── */}
      <div className="px-4 pt-4 pb-3 border-b border-brand-border">
        <p className="font-body text-xs font-medium text-brand-text mb-2.5">Button Color</p>

        {/* Current color indicator */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-lg border border-brand-border shrink-0"
            style={{ background: effectiveBg }}
          />
          <div className="min-w-0">
            <p className="font-body text-xs text-brand-text">
              {overrides.buttonBg
                ? formatColor(overrides.buttonBg)
                : 'Theme default'}
            </p>
            {!overrides.buttonBg && (
              <p className="font-body text-[10px] text-brand-text-muted">
                {formatColor(themeColors.btnBg)}
              </p>
            )}
          </div>
          {overrides.buttonBg && (
            <button
              onClick={() => updateOverrides({ buttonBg: undefined })}
              className="ml-auto font-body text-[10px] font-medium text-brand-accent
                         hover:text-brand-accent-hover transition-colors duration-150"
            >
              Use theme
            </button>
          )}
        </div>

        {/* Quick swatches */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {BUTTON_COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => updateOverrides({ buttonBg: color })}
              className={`w-6 h-6 rounded-full border-2 transition-transform duration-150 hover:scale-110
                ${overrides.buttonBg === color
                  ? 'border-brand-accent scale-110'
                  : 'border-brand-border'
                }`}
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={overrides.buttonBg || (effectiveBg.startsWith('#') ? effectiveBg : '#666666')}
            onChange={(e) => updateOverrides({ buttonBg: e.target.value })}
            className="w-7 h-7 rounded border border-brand-border cursor-pointer shrink-0"
          />
          <input
            type="text"
            value={overrides.buttonBg || ''}
            onChange={(e) => {
              const v = e.target.value;
              updateOverrides({ buttonBg: v || undefined });
            }}
            placeholder={formatColor(effectiveBg)}
            className="flex-1 min-w-0 font-body text-xs px-2.5 py-1.5 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text placeholder:text-brand-text-muted
                       focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>
      </div>

      {/* ── Text Color ── */}
      <div className="px-4 pt-4 pb-4">
        <p className="font-body text-xs font-medium text-brand-text mb-2.5">Text Color</p>

        {/* Current color indicator */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-lg border border-brand-border shrink-0"
            style={{ background: effectiveText }}
          />
          <div className="min-w-0">
            <p className="font-body text-xs text-brand-text">
              {overrides.buttonText
                ? formatColor(overrides.buttonText)
                : 'Theme default'}
            </p>
            {!overrides.buttonText && (
              <p className="font-body text-[10px] text-brand-text-muted">
                {formatColor(themeColors.btnText)}
              </p>
            )}
          </div>
          {overrides.buttonText && (
            <button
              onClick={() => updateOverrides({ buttonText: undefined })}
              className="ml-auto font-body text-[10px] font-medium text-brand-accent
                         hover:text-brand-accent-hover transition-colors duration-150"
            >
              Use theme
            </button>
          )}
        </div>

        {/* Quick swatches */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {TEXT_COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => updateOverrides({ buttonText: color })}
              className={`w-6 h-6 rounded-full border-2 transition-transform duration-150 hover:scale-110
                ${overrides.buttonText === color
                  ? 'border-brand-accent scale-110'
                  : 'border-brand-border'
                }`}
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={overrides.buttonText || (effectiveText.startsWith('#') ? effectiveText : '#ffffff')}
            onChange={(e) => updateOverrides({ buttonText: e.target.value })}
            className="w-7 h-7 rounded border border-brand-border cursor-pointer shrink-0"
          />
          <input
            type="text"
            value={overrides.buttonText || ''}
            onChange={(e) => {
              const v = e.target.value;
              updateOverrides({ buttonText: v || undefined });
            }}
            placeholder={formatColor(effectiveText)}
            className="flex-1 min-w-0 font-body text-xs px-2.5 py-1.5 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text placeholder:text-brand-text-muted
                       focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>
      </div>
    </div>
  );
}
