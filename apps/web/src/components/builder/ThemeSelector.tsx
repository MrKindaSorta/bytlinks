import type { BaseStyle } from '@bytlinks/shared';

const STYLES: { key: BaseStyle; label: string; description: string; preview: { bg: string; text: string; accent: string } }[] = [
  { key: 'minimal', label: 'Minimal', description: 'Ultra-clean, calm authority', preview: { bg: '#ffffff', text: '#1c1917', accent: '#1c1917' } },
  { key: 'bold-type', label: 'Bold Type', description: 'Typography-first, editorial', preview: { bg: '#fafaf9', text: '#0c0a09', accent: '#0c0a09' } },
  { key: 'dark-pro', label: 'Dark Pro', description: 'Deep dark, sharp accents', preview: { bg: '#0a0a0b', text: '#e4e4e7', accent: '#22d3ee' } },
  { key: 'glass', label: 'Glass', description: 'Blur panels, depth, premium', preview: { bg: '#0f172a', text: '#f1f5f9', accent: '#e2e8f0' } },
  { key: 'brutalist', label: 'Brutalist', description: 'Raw borders, stark, bold', preview: { bg: '#ffffff', text: '#000000', accent: '#000000' } },
  { key: 'editorial', label: 'Editorial', description: 'Magazine layout, structured', preview: { bg: '#fefdfb', text: '#1a1a18', accent: '#1a1a18' } },
  { key: 'soft-warm', label: 'Soft Warm', description: 'Rounded, pastels, friendly', preview: { bg: '#fef7f0', text: '#3d2c1e', accent: '#e07a3a' } },
  { key: 'neon-night', label: 'Neon Night', description: 'Dark bg, vivid neon', preview: { bg: '#0a0a12', text: '#e8e8f0', accent: '#00ff88' } },
  { key: 'paper', label: 'Paper', description: 'Off-white, ink-like, analog', preview: { bg: '#f5f0e8', text: '#2c2418', accent: '#2c2418' } },
  { key: 'gradient-flow', label: 'Gradient Flow', description: 'Smooth gradient, creator feel', preview: { bg: '#0f766e', text: '#ffffff', accent: '#ffffff' } },
  { key: 'grid', label: 'Grid', description: 'Visible structure, geometric', preview: { bg: '#f8f8f8', text: '#1a1a1a', accent: '#1a1a1a' } },
  { key: 'retro', label: 'Retro', description: 'Muted, vintage, memorable', preview: { bg: '#f0e6d3', text: '#2a1f14', accent: '#c44d2a' } },
];

interface ThemeSelectorProps {
  value: BaseStyle;
  onChange: (style: BaseStyle) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {STYLES.map((style) => (
        <button
          key={style.key}
          onClick={() => onChange(style.key)}
          className={`relative rounded-xl border p-3 text-left transition-colors duration-fast
            ${value === style.key
              ? 'border-brand-accent ring-2 ring-brand-accent/20'
              : 'border-brand-border hover:border-brand-text-muted'
            }`}
        >
          {/* Mini preview */}
          <div
            className="rounded-lg h-20 mb-2.5 p-2.5 flex flex-col justify-end"
            style={{ background: style.preview.bg }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-4 h-4 rounded-full" style={{ background: style.preview.accent, opacity: 0.3 }} />
              <div className="h-1.5 w-10 rounded-full" style={{ background: style.preview.text, opacity: 0.6 }} />
            </div>
            <div className="h-3 w-full rounded" style={{ background: style.preview.accent }} />
            <div className="h-3 w-full rounded mt-1" style={{ background: style.preview.text, opacity: 0.15 }} />
          </div>

          <p className="font-body text-xs font-semibold text-brand-text">{style.label}</p>
          <p className="font-body text-[10px] text-brand-text-muted leading-tight">{style.description}</p>
        </button>
      ))}
    </div>
  );
}
