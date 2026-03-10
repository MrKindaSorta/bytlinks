import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  ChevronRight, MousePointerClick, Monitor, Check,
  Twitter, Github, Linkedin, Youtube, Instagram, Music2,
  MessageCircle, Twitch, AtSign, Cloud, Mail, Globe,
} from 'lucide-react';
import { usePage } from '../../hooks/usePage';
import { usePageStore } from '../../store/pageStore';
import { useDebounce } from '../../hooks/useDebounce';
import { ThemeSelector } from './ThemeSelector';
import { ColorPicker } from './ColorPicker';

import { FontPicker } from './FontPicker';
import { LayoutPicker } from './LayoutPicker';
import { AnimationPicker } from './AnimationPicker';
import { BackgroundPicker } from './BackgroundPicker';
import { PreviewFrame } from './PreviewFrame';
import { LinkOverrideEditor } from './LinkOverrideEditor';
import type { ThemeColorContext } from './LinkOverrideEditor';
import { STYLE_DEFAULTS, STYLE_COLORS, resolveButtonStyle, resolveLayoutVariant, resolveContentDisplay, hasDesktopOverrides } from '../../utils/styleDefaults';
import { deriveFullPalette, COLOR_PRESETS } from '../../utils/colorDerivation';
import { SOCIAL_PLATFORMS, SOCIAL_ICON_STYLES } from '@bytlinks/shared/constants';
import type { Theme, BaseStyle, ColorMode, ColorPreset, FontPair, Animation, AnimationSpeed, BackgroundEffect, NightSkyConfig, RainConfig, FirefliesConfig, LayoutVariant, ContentDisplay, SectionsMode, SectionNavPosition, SocialLink, SocialPlatform, SocialIconStyle } from '@bytlinks/shared';

/** Resolve theme colors into a full context for button previews.
 *  Works for ALL color modes — style-default uses the JS color map,
 *  preset/custom-simple derive from the palette algorithm. */
function resolveThemeColors(theme: Theme): ThemeColorContext {
  if (theme.colorMode === 'preset' && theme.preset) {
    const colors = COLOR_PRESETS[theme.preset];
    if (colors) {
      const p = deriveFullPalette(colors[0], colors[1], colors[2]);
      return { pageBg: p.bg, pageText: p.text, accent: p.accent, surfaceAlt: p.surfaceAlt, btnBg: p.btnBg, btnText: p.btnText };
    }
  }
  if (theme.colorMode === 'custom-simple' && theme.customColors) {
    const p = deriveFullPalette(theme.customColors.primary, theme.customColors.accent, theme.customColors.text);
    return { pageBg: p.bg, pageText: p.text, accent: p.accent, surfaceAlt: p.surfaceAlt, btnBg: p.btnBg, btnText: p.btnText };
  }
  // style-default: use the JS mirror of the CSS theme file values
  return STYLE_COLORS[theme.base];
}

type SettingsSection = 'style' | 'palette' | 'layout' | 'typography' | 'animation' | 'background' | 'social-badges';
type PreviewMode = 'mobile' | 'desktop';

/* ── Social icon map + styled renderer ── */

const SOCIAL_ICON_MAP: Record<SocialPlatform, React.FC<{ className?: string }>> = {
  x: Twitter,
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Music2,
  discord: MessageCircle,
  twitch: Twitch,
  mastodon: AtSign,
  threads: AtSign,
  bluesky: Cloud,
  email: Mail,
  website: Globe,
};

const ICON_STYLE_KEYS = Object.keys(SOCIAL_ICON_STYLES) as SocialIconStyle[];

interface BadgeThemeColors {
  bg: string;
  text: string;
}

function BadgeStyledIcon({ platform, iconStyle, colors, size = 'md' }: {
  platform: SocialPlatform;
  iconStyle: SocialIconStyle;
  colors: BadgeThemeColors;
  size?: 'sm' | 'md';
}) {
  const Icon = SOCIAL_ICON_MAP[platform] ?? Globe;
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]';
  const wrap = size === 'sm'
    ? 'w-7 h-7 flex items-center justify-center shrink-0'
    : 'w-9 h-9 flex items-center justify-center shrink-0';

  switch (iconStyle) {
    case 'circle-outline':
      return <span className={`${wrap} rounded-full`} style={{ border: '2px solid ' + colors.text, color: colors.text }}><Icon className={iconCls} /></span>;
    case 'circle-filled':
      return <span className={`${wrap} rounded-full`} style={{ backgroundColor: colors.text, color: colors.bg }}><Icon className={iconCls} /></span>;
    case 'square-outline':
      return <span className={`${wrap} rounded-md`} style={{ border: '2px solid ' + colors.text, color: colors.text }}><Icon className={iconCls} /></span>;
    case 'square-filled':
      return <span className={`${wrap} rounded-md`} style={{ backgroundColor: colors.text, color: colors.bg }}><Icon className={iconCls} /></span>;
    default:
      return <span className={wrap} style={{ color: colors.text }}><Icon className={iconCls} /></span>;
  }
}

/* ── Single social badge row with inline style picker ── */

function SocialBadgeRow({ social, colors, onUpdateStyle }: {
  social: SocialLink;
  colors: BadgeThemeColors;
  onUpdateStyle: (id: string, style: SocialIconStyle) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const current = (social.icon_style as SocialIconStyle) ?? 'plain';

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors duration-fast hover:bg-brand-surface-alt"
      >
        <span className="rounded-md p-0.5 shrink-0" style={{ backgroundColor: colors.bg }}>
          <BadgeStyledIcon platform={social.platform as SocialPlatform} iconStyle={current} colors={colors} size="sm" />
        </span>
        <span className="font-body text-sm font-medium text-brand-text flex-1 text-left">
          {SOCIAL_PLATFORMS[social.platform as keyof typeof SOCIAL_PLATFORMS]?.label ?? social.platform}
        </span>
        <span className="font-body text-[11px] text-brand-text-muted">
          {SOCIAL_ICON_STYLES[current].label}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-fast ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-brand-border">
          <div className="grid grid-cols-5 gap-1.5">
            {ICON_STYLE_KEYS.map((style) => {
              const active = style === current;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onUpdateStyle(social.id, style)}
                  className={`relative flex flex-col items-center gap-1 rounded-lg p-2 transition-colors duration-fast
                              ${active ? 'ring-2 ring-brand-accent bg-brand-accent/5' : 'hover:bg-brand-surface-alt'}`}
                >
                  <span className="rounded-md p-0.5" style={{ backgroundColor: colors.bg }}>
                    <BadgeStyledIcon platform={social.platform as SocialPlatform} iconStyle={style} colors={colors} size="sm" />
                  </span>
                  <span className="font-body text-[9px] text-brand-text-muted leading-tight text-center">
                    {SOCIAL_ICON_STYLES[style].label}
                  </span>
                  {active && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-brand-accent flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Animated collapse wrapper ── */

function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const [renderChildren, setRenderChildren] = useState(open);

  // Mount children synchronously when opening
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

/* ── Collapsible section wrapper ── */

function SectionHeader({ title, subtitle, isOpen, onClick }: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg
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

/* ── Main component ── */

export function AppearanceEditor() {
  const { page, updatePage } = usePage();
  const theme: Theme | null = page?.theme ?? null;

  const [openSection, setOpenSection] = useState<SettingsSection | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('mobile');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [socials, setSocials] = useState<SocialLink[]>([]);

  const fetchSocials = useCallback(async () => {
    try {
      const res = await fetch('/api/socials', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSocials(data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSocials(); }, [fetchSocials]);

  const updateSocialIconStyle = useCallback(async (id: string, iconStyle: SocialIconStyle) => {
    setSocials((prev) => prev.map((s) => (s.id === id ? { ...s, icon_style: iconStyle } : s)));
    try {
      await fetch(`/api/socials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon_style: iconStyle }),
      });
    } catch { /* silent — optimistic */ }
  }, []);

  const debouncedSave = useDebounce(async (newTheme: Theme) => {
    try {
      await updatePage({ theme: newTheme });
    } catch {
      // toast in future
    }
  }, 400);

  function update(partial: Partial<Theme>) {
    if (!theme) return;
    usePageStore.getState().updateTheme(partial);
    const latest = usePageStore.getState().page?.theme;
    if (latest) debouncedSave(latest);
  }

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

  function toggleSection(section: SettingsSection) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  if (!theme) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-8 text-center">
        <p className="font-body text-sm text-brand-text-muted">Loading theme...</p>
      </div>
    );
  }

  const isDesktopEditing = previewMode === 'desktop';
  const desktopCustomized = hasDesktopOverrides(theme);

  // Layout labels resolve based on editing context
  const effectiveLayout = isDesktopEditing
    ? (theme.desktopOverrides?.layoutVariant ?? resolveLayoutVariant(theme))
    : resolveLayoutVariant(theme);
  const effectiveDisplay = isDesktopEditing
    ? (theme.desktopOverrides?.contentDisplay ?? resolveContentDisplay(theme))
    : resolveContentDisplay(theme);
  const layoutLabel = effectiveLayout.replace('-', ' ');
  const displayMap: Record<string, string> = { flow: 'Flow', spotlight: 'Spotlight', sections: 'Sections', cards: 'Cards' };
  const displayLabel = displayMap[effectiveDisplay] ?? 'Flow';

  const sectionSubtitles: Record<SettingsSection, string> = {
    style: theme.base.replace('-', ' '),
    palette: theme.colorMode === 'style-default' ? 'Style default' : theme.colorMode === 'preset' ? (theme.preset ?? 'Preset') : 'Custom',
    layout: isDesktopEditing && !desktopCustomized
      ? 'Following mobile'
      : `${layoutLabel}, ${displayLabel}`,
    typography: theme.fontPair === 'style-default' ? 'Style default' : theme.fontPair,
    animation: theme.animation === 'none' ? 'None' : theme.animation,
    background: !theme.backgroundEffect || theme.backgroundEffect === 'none' || theme.backgroundEffect === 'aurora' || theme.backgroundEffect === 'shooting-stars' || theme.backgroundEffect === 'starfield' || theme.backgroundEffect === 'particles' ? 'None' : theme.backgroundEffect === 'night-sky' ? 'Night Sky' : theme.backgroundEffect.charAt(0).toUpperCase() + theme.backgroundEffect.slice(1).replace('-', ' '),
    'social-badges': socials.length > 0 ? `${socials.length} link${socials.length === 1 ? '' : 's'}` : 'No social links',
  };

  /* ── Shared settings sections (renders once, used in both mobile & desktop) ── */

  const settingsSections = (
    <>
      {/* Device context indicator */}
      {isDesktopEditing && (
        <div className="px-3 py-2.5 border-b border-brand-border bg-brand-surface-alt/50">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-brand-accent" />
            <p className="font-body text-[11px] font-semibold text-brand-accent">
              Editing desktop layout
            </p>
          </div>
          <p className="font-body text-[10px] text-brand-text-muted mt-0.5 ml-[22px]">
            Style, colors, fonts, and buttons are shared across devices.
          </p>
        </div>
      )}

      <div className="border-b border-brand-border">
        <SectionHeader
          title="Style"
          subtitle={sectionSubtitles.style}
          isOpen={openSection === 'style'}
          onClick={() => toggleSection('style')}
        />
        <AnimatedCollapse open={openSection === 'style'}>
          <div className="px-3 pb-3">
            <ThemeSelector value={theme.base} onChange={handleStyleChange} />
          </div>
        </AnimatedCollapse>
      </div>

      <div className="border-b border-brand-border">
        <SectionHeader
          title="Palette"
          subtitle={sectionSubtitles.palette}
          isOpen={openSection === 'palette'}
          onClick={() => toggleSection('palette')}
        />
        <AnimatedCollapse open={openSection === 'palette'}>
          <div className="px-3 pb-3">
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

      <div className="border-b border-brand-border">
        <SectionHeader
          title="Layout"
          subtitle={sectionSubtitles.layout}
          isOpen={openSection === 'layout'}
          onClick={() => toggleSection('layout')}
        />
        <AnimatedCollapse open={openSection === 'layout'}>
          <div className="px-3 pb-3">
            {isDesktopEditing && !desktopCustomized ? (
              /* Desktop: following mobile — show prompt to customize */
              <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface/50
                              p-5 text-center">
                <p className="font-body text-xs text-brand-text-muted mb-1">
                  Desktop follows mobile layout
                </p>
                <p className="font-body text-[11px] text-brand-text-muted/70 leading-relaxed mb-4">
                  Customize to set a different layout for larger screens.
                </p>
                <button
                  onClick={() => {
                    update({
                      desktopOverrides: {
                        layoutVariant: resolveLayoutVariant(theme),
                        contentDisplay: resolveContentDisplay(theme),
                      },
                    });
                  }}
                  className="font-body text-xs font-semibold px-4 py-2 rounded-lg
                             bg-brand-accent text-white transition-colors duration-150
                             hover:opacity-90"
                >
                  Customize for desktop
                </button>
              </div>
            ) : isDesktopEditing && desktopCustomized ? (
              /* Desktop: customized — show layout picker with desktop overrides + reset */
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
                  Reset to follow mobile
                </button>
              </>
            ) : (
              /* Mobile: standard layout picker */
              <LayoutPicker
                layoutVariant={theme.layoutVariant ?? 'centered'}
                contentDisplay={resolveContentDisplay(theme)}
                onChangeLayout={(layoutVariant: LayoutVariant) => update({ layoutVariant })}
                onChangeDisplay={(contentDisplay: ContentDisplay) => {
                  const partial: Partial<Theme> = { contentDisplay };
                  // Auto-create sections config when switching to sections/cards
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

      <div className="border-b border-brand-border">
        <SectionHeader
          title="Typography"
          subtitle={sectionSubtitles.typography}
          isOpen={openSection === 'typography'}
          onClick={() => toggleSection('typography')}
        />
        <AnimatedCollapse open={openSection === 'typography'}>
          <div className="px-3 pb-3">
            <FontPicker
              value={theme.fontPair}
              baseStyle={theme.base}
              onChange={(fontPair: FontPair | 'style-default') => update({ fontPair })}
            />
          </div>
        </AnimatedCollapse>
      </div>

      <div className="border-b border-brand-border">
        <SectionHeader
          title="Animation"
          subtitle={sectionSubtitles.animation}
          isOpen={openSection === 'animation'}
          onClick={() => toggleSection('animation')}
        />
        <AnimatedCollapse open={openSection === 'animation'}>
          <div className="px-3 pb-3">
            <AnimationPicker
              value={theme.animation}
              speed={theme.animationSpeed ?? 'default'}
              onChange={(animation: Animation) => update({ animation })}
              onChangeSpeed={(animationSpeed: AnimationSpeed) => update({ animationSpeed })}
            />
          </div>
        </AnimatedCollapse>
      </div>

      <div className="border-b border-brand-border">
        <SectionHeader
          title="Background"
          subtitle={sectionSubtitles.background}
          isOpen={openSection === 'background'}
          onClick={() => toggleSection('background')}
        />
        <AnimatedCollapse open={openSection === 'background'}>
          <div className="px-3 pb-3">
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

      <div>
        <SectionHeader
          title="Social Badges"
          subtitle={sectionSubtitles['social-badges']}
          isOpen={openSection === 'social-badges'}
          onClick={() => toggleSection('social-badges')}
        />
        <AnimatedCollapse open={openSection === 'social-badges'}>
          <div className="px-3 pb-3">
            {socials.length > 0 ? (
              <div className="space-y-2">
                {socials.map((social) => {
                  const tc = resolveThemeColors(theme);
                  return (
                    <SocialBadgeRow
                      key={social.id}
                      social={social}
                      colors={{ bg: tc.pageBg, text: tc.pageText }}
                      onUpdateStyle={updateSocialIconStyle}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface/50
                              p-5 text-center">
                <p className="font-body text-xs text-brand-text-muted">
                  No social links yet
                </p>
                <p className="font-body text-[11px] text-brand-text-muted/70 leading-relaxed mt-1">
                  Add social links on the Links & Info page to customize their badge style here.
                </p>
              </div>
            )}
          </div>
        </AnimatedCollapse>
      </div>
    </>
  );

  /* ── Link editor or empty state (shared between xl right panel & inline) ── */

  const linkEditor = selectedLinkId ? (
    <LinkOverrideEditor
      linkId={selectedLinkId}
      onClose={() => setSelectedLinkId(null)}
      globalButtonStyle={resolveButtonStyle(theme)}
      themeColors={resolveThemeColors(theme)}
    />
  ) : null;

  const linkEditorEmptyState = (
    <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface/50
                    flex flex-col items-center justify-center p-8 text-center min-h-[240px]">
      <div className="w-10 h-10 rounded-full bg-brand-surface-alt flex items-center justify-center mb-3">
        <MousePointerClick className="w-5 h-5 text-brand-text-muted" />
      </div>
      <p className="font-display text-xs font-600 text-brand-text-muted mb-1">
        No link selected
      </p>
      <p className="font-body text-[11px] text-brand-text-muted/70 leading-relaxed max-w-[200px]">
        Click any link in the preview to customize its style individually.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row xl:flex-row gap-4 xl:gap-3 items-start">
      {/* ── Settings Panel ──
          Mobile: full-width stacked at top
          lg: side panel 300px
          xl: side panel 320px */}
      <div className="w-full lg:w-[345px] xl:w-[368px] shrink-0
                      lg:sticky lg:top-6 lg:self-start
                      lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto
                      rounded-xl border border-brand-border bg-brand-surface">
        {settingsSections}
      </div>

      {/* ── Preview ──
          Takes remaining space. Phone frame self-constrains to 375px max. */}
      <div className="flex-1 min-w-0">
        <PreviewFrame
          mode={previewMode}
          onModeChange={setPreviewMode}
          selectedLinkId={selectedLinkId}
          onSelectLink={setSelectedLinkId}
          socials={socials}
        />

        {/* Link editor inline below preview (mobile + lg only, hidden at xl) */}
        {selectedLinkId && (
          <div className="xl:hidden mt-4">
            {linkEditor}
          </div>
        )}
      </div>

      {/* ── Right Panel: Per-link editor (xl+ only) ──
          Shows link customization when a link is selected,
          otherwise a hint prompting the user to click a link. */}
      <div className="hidden xl:block w-[280px] shrink-0
                      xl:sticky xl:top-6 xl:self-start
                      xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto">
        {linkEditor ?? linkEditorEmptyState}
      </div>
    </div>
  );
}
