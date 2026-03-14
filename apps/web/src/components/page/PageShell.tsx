import { useEffect, useRef } from 'react';
import type { Theme } from '@bytlinks/shared';
import { applyTheme, getAnimationClass } from '../../utils/themeApplicator';
import { deriveFullPalette, applyDerivedPalette, COLOR_PRESETS } from '../../utils/colorDerivation';
import { AnimatedBackground } from './AnimatedBackground';

interface PageShellProps {
  theme: Theme;
  children: React.ReactNode;
}

/**
 * Top-level layout shell for the public page.
 * Applies the data-theme attribute, font overrides, custom color palette,
 * animation speed, and the entrance animation class.
 */
export function PageShell({ theme, children }: PageShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shellRef.current) return;
    applyTheme(theme, shellRef.current);

    // Colors: only apply derived palette when user explicitly overrides
    if (theme.colorMode === 'custom-simple' && theme.customColors) {
      const palette = deriveFullPalette(
        theme.customColors.primary,
        theme.customColors.accent,
        theme.customColors.text,
      );
      applyDerivedPalette(palette, shellRef.current);
    } else if (theme.colorMode === 'preset' && theme.preset) {
      const presetColors = COLOR_PRESETS[theme.preset];
      if (presetColors) {
        const palette = deriveFullPalette(presetColors[0], presetColors[1], presetColors[2]);
        applyDerivedPalette(palette, shellRef.current);
      }
    }
    // colorMode === 'style-default': CSS theme file colors apply automatically, no overrides needed
  }, [theme]);

  const animClass = getAnimationClass(theme.animation);

  return (
    <div
      ref={shellRef}
      data-theme={theme.base}
      className={`min-h-screen flex flex-col min-w-0 overflow-x-hidden ${animClass} relative`}
      style={{
        background: 'var(--page-bg)',
        color: 'var(--page-text)',
        fontFamily: 'var(--page-font-body)',
      }}
    >
      <AnimatedBackground effect={theme.backgroundEffect ?? 'none'} intensity={theme.backgroundIntensity ?? 50} nightSkyConfig={theme.nightSkyConfig} rainConfig={theme.rainConfig} firefliesConfig={theme.firefliesConfig} />
      <div className="relative flex-1 flex flex-col min-w-0 overflow-x-hidden" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
