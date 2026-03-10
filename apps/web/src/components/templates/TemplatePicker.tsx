import { useState } from 'react';
import { Music, Code, Briefcase, Heart, Mic, Camera, BookOpen, Rocket } from 'lucide-react';
import { PROFILE_TEMPLATES } from '@bytlinks/shared/templates';
import type { ProfileTemplate } from '@bytlinks/shared';
import { STYLE_COLORS } from '../../utils/styleDefaults';
import type { BaseStyle } from '@bytlinks/shared';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Music, Code, Briefcase, Heart, Mic, Camera, BookOpen, Rocket,
};

interface TemplatePickerProps {
  onApply: (template: ProfileTemplate) => void;
  onSkip: () => void;
  fullscreen?: boolean;
}

export function TemplatePicker({ onApply, onSkip, fullscreen }: TemplatePickerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedTemplate = PROFILE_TEMPLATES.find((t) => t.id === selected);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[70] bg-brand-bg flex flex-col items-center overflow-y-auto'
          : 'w-full'
      }
    >
      <div className="w-full max-w-2xl px-4 py-8 mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-2xl font-800 tracking-tight text-brand-text">
            Choose a template
          </h2>
          {fullscreen && (
            <button
              onClick={onSkip}
              className="font-body text-sm font-medium text-brand-text-muted hover:text-brand-text transition-colors"
            >
              Skip
            </button>
          )}
        </div>
        <p className="font-body text-sm text-brand-text-secondary mb-6">
          Pick a starting point — you can customize everything later.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {PROFILE_TEMPLATES.map((template) => {
            const colors = STYLE_COLORS[(template.theme.base as BaseStyle) || 'minimal'];
            const Icon = ICON_MAP[template.icon] || Briefcase;
            const isSelected = selected === template.id;

            return (
              <button
                key={template.id}
                onClick={() => setSelected(template.id)}
                className={`rounded-xl border-2 p-3 text-left transition-all duration-150
                  ${isSelected
                    ? 'border-brand-accent ring-2 ring-brand-accent/30 scale-[1.02]'
                    : 'border-brand-border hover:border-brand-text-muted'
                  }`}
              >
                {/* Mini preview */}
                <div
                  className="rounded-lg mb-3 p-3 flex flex-col items-center gap-1.5"
                  style={{ background: colors.pageBg }}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: colors.surfaceAlt }}
                  />
                  <div
                    className="w-16 h-1.5 rounded-full"
                    style={{ background: colors.pageText, opacity: 0.6 }}
                  />
                  <div
                    className="w-full h-5 rounded mt-1"
                    style={{ background: colors.btnBg }}
                  />
                  <div
                    className="w-full h-5 rounded"
                    style={{ background: colors.btnBg, opacity: 0.6 }}
                  />
                </div>

                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className="w-3.5 h-3.5 text-brand-accent" />
                  <span className="font-body text-sm font-semibold text-brand-text">
                    {template.label}
                  </span>
                </div>
                <p className="font-body text-[11px] text-brand-text-muted leading-tight">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => selectedTemplate && onApply(selectedTemplate)}
            disabled={!selectedTemplate}
            className="flex-1 font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                       bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Template
          </button>
          <button
            onClick={onSkip}
            className="font-body text-sm font-medium px-4 py-2.5 rounded-lg
                       text-brand-text-muted hover:text-brand-text transition-colors duration-fast"
          >
            {fullscreen ? 'Start from scratch' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
