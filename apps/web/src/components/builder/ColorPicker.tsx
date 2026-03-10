import { useState } from 'react';
import type { ColorMode, ColorPreset } from '@bytlinks/shared';

const PRESETS: { key: ColorPreset; label: string; colors: [string, string, string] }[] = [
  { key: 'ink', label: 'Ink', colors: ['#ffffff', '#1c1917', '#1c1917'] },
  { key: 'midnight', label: 'Midnight', colors: ['#0f172a', '#e2e8f0', '#38bdf8'] },
  { key: 'sand', label: 'Sand', colors: ['#faf5ef', '#44403c', '#c2956a'] },
  { key: 'forest', label: 'Forest', colors: ['#1a2e1a', '#d4e4d4', '#4ade80'] },
  { key: 'rose-gold', label: 'Rose Gold', colors: ['#fdf2f8', '#4a2040', '#e879a0'] },
  { key: 'arctic', label: 'Arctic', colors: ['#f0f9ff', '#1e3a5f', '#0ea5e9'] },
  { key: 'dusk', label: 'Dusk', colors: ['#1c1527', '#e4dde8', '#c084fc'] },
  { key: 'ember', label: 'Ember', colors: ['#1a0f0a', '#e8d5c4', '#f97316'] },
  { key: 'ocean', label: 'Ocean', colors: ['#0c1929', '#c8dce8', '#06b6d4'] },
  { key: 'slate', label: 'Slate', colors: ['#f8fafc', '#334155', '#475569'] },
  { key: 'clay', label: 'Clay', colors: ['#f5ebe0', '#3d2b1f', '#a67b5b'] },
  { key: 'moss', label: 'Moss', colors: ['#f0f4e8', '#2d3b1e', '#6b8f3c'] },
  { key: 'storm', label: 'Storm', colors: ['#111827', '#d1d5db', '#6b7280'] },
  { key: 'coral', label: 'Coral', colors: ['#fff5f5', '#3b1818', '#f87171'] },
  { key: 'charcoal', label: 'Charcoal', colors: ['#18181b', '#e4e4e7', '#a1a1aa'] },
];

interface ColorPickerProps {
  colorMode: ColorMode;
  preset?: ColorPreset;
  customColors?: { primary: string; accent: string; text: string };
  onChangeMode: (mode: ColorMode) => void;
  onChangePreset: (preset: ColorPreset) => void;
  onChangeCustom: (colors: { primary: string; accent: string; text: string }) => void;
}

export function ColorPicker({
  colorMode,
  preset,
  customColors,
  onChangeMode,
  onChangePreset,
  onChangeCustom,
}: ColorPickerProps) {
  const [custom, setCustom] = useState(customColors ?? { primary: '#ffffff', accent: '#0d9488', text: '#1c1917' });

  function handleCustomChange(field: 'primary' | 'accent' | 'text', value: string) {
    const updated = { ...custom, [field]: value };
    setCustom(updated);
    onChangeCustom(updated);
  }

  const modes: { key: ColorMode; label: string }[] = [
    { key: 'style-default', label: 'Style default' },
    { key: 'preset', label: 'Presets' },
    { key: 'custom-simple', label: 'Custom' },
  ];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onChangeMode(mode.key)}
            className={`font-body text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-fast
              ${colorMode === mode.key
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Style default hint */}
      {colorMode === 'style-default' && (
        <p className="font-body text-xs text-brand-text-muted">
          Using the colors built into your selected style.
        </p>
      )}

      {/* Presets grid */}
      {colorMode === 'preset' && (
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => onChangePreset(p.key)}
              className={`rounded-lg border p-1.5 transition-colors duration-fast
                ${preset === p.key
                  ? 'border-brand-accent ring-2 ring-brand-accent/20'
                  : 'border-brand-border hover:border-brand-text-muted'
                }`}
              title={p.label}
            >
              <div className="flex gap-0.5 rounded overflow-hidden h-6">
                <div className="flex-1" style={{ background: p.colors[0] }} />
                <div className="flex-1" style={{ background: p.colors[1] }} />
                <div className="flex-1" style={{ background: p.colors[2] }} />
              </div>
              <p className="font-body text-[9px] text-brand-text-muted mt-1 text-center truncate">{p.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Custom color inputs */}
      {colorMode === 'custom-simple' && (
        <div className="space-y-3">
          {[
            { key: 'primary' as const, label: 'Background' },
            { key: 'accent' as const, label: 'Accent' },
            { key: 'text' as const, label: 'Text' },
          ].map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <input
                type="color"
                value={custom[field.key]}
                onChange={(e) => handleCustomChange(field.key, e.target.value)}
                className="w-8 h-8 rounded-lg border border-brand-border cursor-pointer p-0.5"
              />
              <div className="flex-1">
                <label className="font-body text-xs font-medium text-brand-text">{field.label}</label>
                <p className="font-body text-[10px] text-brand-text-muted uppercase tracking-wider">{custom[field.key]}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
