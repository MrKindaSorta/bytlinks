import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { usePage } from '../../hooks/usePage';
import { usePageStore } from '../../store/pageStore';
import { useDebounce } from '../../hooks/useDebounce';
import { ThemeSelector } from '../builder/ThemeSelector';
import { ColorPicker } from '../builder/ColorPicker';
import { ButtonStylePicker } from '../builder/ButtonStylePicker';
import { FontPicker } from '../builder/FontPicker';
import { LayoutPicker } from '../builder/LayoutPicker';
import { AnimationPicker } from '../builder/AnimationPicker';
import { BackgroundPicker } from '../builder/BackgroundPicker';
import {
  STYLE_DEFAULTS,
  resolveLayoutVariant,
  resolveContentDisplay,
  hasDesktopOverrides,
} from '../../utils/styleDefaults';
import type {
  Theme,
  BaseStyle,
  ColorMode,
  ColorPreset,
  ButtonStyle,
  FontPair,
  Animation,
  AnimationSpeed,
  BackgroundEffect,
  NightSkyConfig,
  RainConfig,
  FirefliesConfig,
  LayoutVariant,
  ContentDisplay,
  SectionsMode,
  SectionNavPosition,
} from '@bytlinks/shared';

/* ── Animated collapse wrapper ── */

function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const [renderChildren, setRenderChildren] = useState(open);

  if (open && !renderChildren) setRenderChildren(true);

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    if (!open) {
      setHeight(0);
      return;
    }

    // Set initial measured height
    setHeight(contentRef.current.scrollHeight);

    // Watch for content size changes (e.g. sub-options appearing/disappearing)
    const observer = new ResizeObserver(() => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [open, renderChildren]);

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== 'height') return;
    if (!open) setRenderChildren(false);
  }

  return (
    <div
      style={{
        height,
        opacity: open ? 1 : 0,
        overflow: 'hidden',
        transition: 'height 220ms ease, opacity 180ms ease',
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {renderChildren && <div ref={contentRef}>{children}</div>}
    </div>
  );
}

/* ── Collapsible section header ── */

function SectionHeader({ title, subtitle, isOpen, onClick }: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left
                 transition-colors duration-150 hover:bg-brand-surface-alt"
    >
      <ChevronRight
        className={`w-3.5 h-3.5 text-brand-text-muted shrink-0
                    transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
      />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-600 tracking-tight text-brand-text leading-tight">
          {title}
        </p>
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: isOpen ? 0 : 18, opacity: isOpen ? 0 : 1 }}
        >
          <p className="font-body text-[11px] text-brand-text-muted truncate">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

/* ── Types ── */

type AppearanceSection = 'style' | 'palette' | 'buttons' | 'layout' | 'typography' | 'animation' | 'background';

interface AppearanceDrawerProps {
  open: boolean;
  onClose: () => void;
}

/* ── Main component ── */

export function AppearanceDrawer({ open, onClose }: AppearanceDrawerProps) {
  const { page, updatePage } = usePage();
  const theme: Theme | null = page?.theme ?? null;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [openSection, setOpenSection] = useState<AppearanceSection | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [open]);

  function handleTransitionEnd() {
    if (!visible && !open) setMounted(false);
  }

  function handleClose() {
    setVisible(false);
    setTimeout(() => onClose(), 250);
  }

  const debouncedSave = useDebounce(async (newTheme: Theme) => {
    try {
      await updatePage({ theme: newTheme });
    } catch {
      // silent
    }
  }, 400);

  const update = useCallback((partial: Partial<Theme>) => {
    if (!theme) return;
    usePageStore.getState().updateTheme(partial);
    const latest = usePageStore.getState().page?.theme;
    if (latest) debouncedSave(latest);
  }, [theme, debouncedSave]);

  function handleStyleChange(base: BaseStyle) {
    const defaults = STYLE_DEFAULTS[base];
    update({
      base,
      colorMode: 'style-default',
      fontPair: 'style-default',
      buttonStyle: 'style-default',
      animation: defaults.animation,
      layoutVariant: defaults.layoutVariant,
      contentDisplay: defaults.contentDisplay,
      desktopOverrides: null,
      sectionsConfig: null,
    });
  }

  function toggleSection(section: AppearanceSection) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  if (!mounted) return null;

  // Subtitle resolvers
  const desktopCustomized = theme ? hasDesktopOverrides(theme) : false;
  const effectiveLayout = theme ? resolveLayoutVariant(theme) : 'centered';
  const effectiveDisplay = theme ? resolveContentDisplay(theme) : 'flow';
  const layoutLabel = effectiveLayout.replace('-', ' ');
  const displayMap: Record<string, string> = { flow: 'Flow', spotlight: 'Spotlight', sections: 'Sections', cards: 'Cards' };
  const displayLabel = displayMap[effectiveDisplay] ?? 'Flow';

  const sectionSubtitles: Record<AppearanceSection, string> = {
    style: theme?.base.replace('-', ' ') ?? '',
    palette: !theme ? '' : theme.colorMode === 'style-default' ? 'Style default' : theme.colorMode === 'preset' ? (theme.preset ?? 'Preset') : 'Custom',
    buttons: !theme ? '' : theme.buttonStyle === 'style-default' ? 'Style default' : theme.buttonStyle,
    layout: `${layoutLabel}, ${displayLabel}`,
    typography: !theme ? '' : theme.fontPair === 'style-default' ? 'Style default' : theme.fontPair,
    animation: !theme ? '' : theme.animation === 'none' ? 'None' : theme.animation,
    background: !theme ? '' : !theme.backgroundEffect || theme.backgroundEffect === 'none' ? 'None' : theme.backgroundEffect === 'night-sky' ? 'Night Sky' : theme.backgroundEffect.charAt(0).toUpperCase() + theme.backgroundEffect.slice(1).replace('-', ' '),
  };

  return (
    <div className="fixed inset-0 z-[60]" onTransitionEnd={handleTransitionEnd}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
        onClick={handleClose}
      />

      {/* Panel — left side on desktop, bottom on mobile */}
      <div
        className="absolute left-0 top-0 bottom-0 w-full max-w-[400px] bg-brand-surface border-r border-brand-border
                   flex flex-col shadow-xl
                   max-lg:top-auto max-lg:left-0 max-lg:right-0 max-lg:bottom-0 max-lg:max-w-none max-lg:max-h-[85vh]
                   max-lg:rounded-t-2xl max-lg:border-r-0 max-lg:border-t"
        style={{
          transform: visible
            ? 'translateX(0) translateY(0)'
            : window.innerWidth >= 1024
              ? 'translateX(-100%)'
              : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
          <div>
            <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
              Customize
            </h2>
            <p className="font-body text-[11px] text-brand-text-muted mt-0.5">
              Changes apply in real-time
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-alt
                       transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto">
          {!theme ? (
            <div className="p-6 text-center">
              <p className="font-body text-sm text-brand-text-muted">Loading theme...</p>
            </div>
          ) : (
            <>
              {/* Style */}
              <div className="border-b border-brand-border">
                <SectionHeader
                  title="Style"
                  subtitle={sectionSubtitles.style}
                  isOpen={openSection === 'style'}
                  onClick={() => toggleSection('style')}
                />
                <AnimatedCollapse open={openSection === 'style'}>
                  <div className="px-4 pb-4">
                    <ThemeSelector value={theme.base} onChange={handleStyleChange} />
                  </div>
                </AnimatedCollapse>
              </div>

              {/* Palette */}
              <div className="border-b border-brand-border">
                <SectionHeader
                  title="Palette"
                  subtitle={sectionSubtitles.palette}
                  isOpen={openSection === 'palette'}
                  onClick={() => toggleSection('palette')}
                />
                <AnimatedCollapse open={openSection === 'palette'}>
                  <div className="px-4 pb-4">
                    <ColorPicker
                      colorMode={theme.colorMode}
                      preset={theme.preset}
                      customColors={theme.customColors}
                      onChangeMode={(colorMode: ColorMode) => update({ colorMode })}
                      onChangePreset={(preset: ColorPreset) => update({ preset, colorMode: 'preset' })}
                      onChangeCustom={(customColors) => update({ customColors, colorMode: 'custom-simple' })}
                    />
                  </div>
                </AnimatedCollapse>
              </div>

              {/* Buttons */}
              <div className="border-b border-brand-border">
                <SectionHeader
                  title="Buttons"
                  subtitle={sectionSubtitles.buttons}
                  isOpen={openSection === 'buttons'}
                  onClick={() => toggleSection('buttons')}
                />
                <AnimatedCollapse open={openSection === 'buttons'}>
                  <div className="px-4 pb-4">
                    <ButtonStylePicker
                      value={theme.buttonStyle}
                      baseStyle={theme.base}
                      onChange={(buttonStyle: ButtonStyle | 'style-default') => update({ buttonStyle })}
                    />
                  </div>
                </AnimatedCollapse>
              </div>

              {/* Layout */}
              <div className="border-b border-brand-border">
                <SectionHeader
                  title="Layout"
                  subtitle={sectionSubtitles.layout}
                  isOpen={openSection === 'layout'}
                  onClick={() => toggleSection('layout')}
                />
                <AnimatedCollapse open={openSection === 'layout'}>
                  <div className="px-4 pb-4">
                    {desktopCustomized ? (
                      <>
                        <LayoutPicker
                          layoutVariant={theme.desktopOverrides?.layoutVariant ?? resolveLayoutVariant(theme)}
                          contentDisplay={theme.desktopOverrides?.contentDisplay ?? resolveContentDisplay(theme)}
                          onChangeLayout={(layoutVariant: LayoutVariant) =>
                            update({ desktopOverrides: { layoutVariant } })
                          }
                          onChangeDisplay={(contentDisplay: ContentDisplay) =>
                            update({ desktopOverrides: { contentDisplay } })
                          }
                          twoColumnDesktop={theme.twoColumnDesktop}
                          onChangeTwoColumn={(twoColumnDesktop: boolean) => update({ twoColumnDesktop })}
                        />
                        <button
                          onClick={() => update({ desktopOverrides: null })}
                          className="mt-3 w-full font-body text-[11px] font-medium text-brand-text-muted
                                     hover:text-brand-text transition-colors duration-150 py-1.5"
                        >
                          Reset desktop overrides
                        </button>
                      </>
                    ) : (
                      <LayoutPicker
                        layoutVariant={theme.layoutVariant ?? 'centered'}
                        contentDisplay={resolveContentDisplay(theme)}
                        onChangeLayout={(layoutVariant: LayoutVariant) => update({ layoutVariant })}
                        onChangeDisplay={(contentDisplay: ContentDisplay) => {
                          const partial: Partial<Theme> = { contentDisplay };
                          if ((contentDisplay === 'sections' || contentDisplay === 'cards') && !theme.sectionsConfig) {
                            const sectionOrder = page?.section_order ?? ['links'];
                            const items = sectionOrder.filter((e) => e !== 'social_links');
                            partial.sectionsConfig = {
                              mode: 'anchor',
                              navPosition: 'top',
                              sections: [{ id: 'main', label: 'Main', items }],
                            };
                          }
                          update(partial);
                        }}
                        twoColumnDesktop={theme.twoColumnDesktop}
                        onChangeTwoColumn={(twoColumnDesktop: boolean) => update({ twoColumnDesktop })}
                        sectionsMode={theme.sectionsConfig?.mode}
                        sectionNavPosition={theme.sectionsConfig?.navPosition}
                        onChangeSectionsMode={(mode: SectionsMode) =>
                          update({ sectionsConfig: { ...theme.sectionsConfig!, mode } })
                        }
                        onChangeSectionNavPosition={(navPosition: SectionNavPosition) =>
                          update({ sectionsConfig: { ...theme.sectionsConfig!, navPosition } })
                        }
                      />
                    )}
                  </div>
                </AnimatedCollapse>
              </div>

              {/* Typography */}
              <div className="border-b border-brand-border">
                <SectionHeader
                  title="Typography"
                  subtitle={sectionSubtitles.typography}
                  isOpen={openSection === 'typography'}
                  onClick={() => toggleSection('typography')}
                />
                <AnimatedCollapse open={openSection === 'typography'}>
                  <div className="px-4 pb-4">
                    <FontPicker
                      value={theme.fontPair}
                      baseStyle={theme.base}
                      onChange={(fontPair: FontPair | 'style-default') => update({ fontPair })}
                    />
                  </div>
                </AnimatedCollapse>
              </div>

              {/* Animation */}
              <div className="border-b border-brand-border">
                <SectionHeader
                  title="Animation"
                  subtitle={sectionSubtitles.animation}
                  isOpen={openSection === 'animation'}
                  onClick={() => toggleSection('animation')}
                />
                <AnimatedCollapse open={openSection === 'animation'}>
                  <div className="px-4 pb-4">
                    <AnimationPicker
                      value={theme.animation}
                      speed={theme.animationSpeed ?? 'default'}
                      onChange={(animation: Animation) => update({ animation })}
                      onChangeSpeed={(animationSpeed: AnimationSpeed) => update({ animationSpeed })}
                    />
                  </div>
                </AnimatedCollapse>
              </div>

              {/* Background */}
              <div>
                <SectionHeader
                  title="Background"
                  subtitle={sectionSubtitles.background}
                  isOpen={openSection === 'background'}
                  onClick={() => toggleSection('background')}
                />
                <AnimatedCollapse open={openSection === 'background'}>
                  <div className="px-4 pb-4">
                    <BackgroundPicker
                      value={theme.backgroundEffect ?? 'none'}
                      intensity={theme.backgroundIntensity ?? 50}
                      nightSkyConfig={theme.nightSkyConfig}
                      rainConfig={theme.rainConfig}
                      firefliesConfig={theme.firefliesConfig}
                      onChange={(backgroundEffect: BackgroundEffect) => update({ backgroundEffect })}
                      onChangeIntensity={(backgroundIntensity: number) => update({ backgroundIntensity })}
                      onChangeNightSky={(nightSkyConfig: NightSkyConfig) => update({ nightSkyConfig })}
                      onChangeRain={(rainConfig: RainConfig) => update({ rainConfig })}
                      onChangeFireflies={(firefliesConfig: FirefliesConfig) => update({ firefliesConfig })}
                    />
                  </div>
                </AnimatedCollapse>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
