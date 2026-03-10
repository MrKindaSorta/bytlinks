import { useEffect, useRef, useState, useCallback } from 'react';
import { Smartphone, Monitor, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePage } from '../../hooks/usePage';
import { useLinks } from '../../hooks/useLinks';
import { useBlocks } from '../../hooks/useBlocks';
import { applyTheme, getAnimationClass } from '../../utils/themeApplicator';
import { deriveFullPalette, applyDerivedPalette, COLOR_PRESETS } from '../../utils/colorDerivation';
import { resolveButtonStyle, resolveLayoutVariant, resolveContentDisplay, resolveDesktopLayoutVariant, resolveDesktopContentDisplay } from '../../utils/styleDefaults';
import type { Theme, ButtonStyle, LayoutVariant, Link as LinkType, SocialLink, ContentBlockType } from '@bytlinks/shared';
import { AnimatedBackground } from '../page/AnimatedBackground';
import { PreviewHero, PreviewSections, PreviewBadge } from '../page/PreviewPageContent';
import { PageLinks } from '../page/PageLinks';
import { PageSocials } from '../page/PageSocials';
import { CardDots } from '../page/CardDots';
import { blockRendererRegistry } from '../page/blocks/blockRendererRegistry';
import { usePageStore } from '../../store/pageStore';

type PreviewMode = 'mobile' | 'desktop';

interface PreviewFrameProps {
  mode?: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
  selectedLinkId?: string | null;
  onSelectLink?: (id: string | null) => void;
  socials?: SocialLink[];
  fillHeight?: boolean;
}

/* ── Theme application hook ── */

function useThemeApplication(
  ref: React.RefObject<HTMLDivElement | null>,
  theme: Theme | null,
  mode: PreviewMode,
) {
  useEffect(() => {
    if (!ref.current || !theme) return;
    applyTheme(theme, ref.current);

    if (theme.colorMode === 'custom-simple' && theme.customColors) {
      const palette = deriveFullPalette(theme.customColors.primary, theme.customColors.accent, theme.customColors.text);
      applyDerivedPalette(palette, ref.current);
    } else if (theme.colorMode === 'preset' && theme.preset) {
      const presetColors = COLOR_PRESETS[theme.preset];
      if (presetColors) {
        const palette = deriveFullPalette(presetColors[0], presetColors[1], presetColors[2]);
        applyDerivedPalette(palette, ref.current);
      }
    }
  }, [ref, theme, mode]);
}

/* ── Scroll hint ── */

function ScrollHint() {
  return (
    <div className="flex flex-col items-center gap-1.5 mt-8 animate-bounce">
      <ChevronDown className="w-5 h-5 opacity-40" style={{ color: 'var(--page-text)' }} />
      <span className="text-[11px] font-medium opacity-30" style={{ color: 'var(--page-text)' }}>
        Scroll for links
      </span>
    </div>
  );
}

/* ── Placeholder blocks ── */

function EmptyPlaceholders() {
  const bg = 'var(--page-surface-alt, rgba(128,128,128,0.1))';
  return (
    <div className="space-y-2">
      <div className="w-full h-11 rounded-lg" style={{ background: bg }} />
      <div className="w-full h-11 rounded-lg" style={{ background: bg }} />
      <div className="w-full h-11 rounded-lg" style={{ background: bg }} />
    </div>
  );
}

/* ── Sections preview nav ── */

function PreviewSectionNav({ sections, activeId, onSelect }: {
  sections: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="flex overflow-x-auto border-b"
      style={{
        borderColor: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
        background: 'var(--page-bg)',
      }}
    >
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={(e) => { e.stopPropagation(); onSelect(s.id); }}
          className="shrink-0 px-3 py-2 font-body text-xs font-medium transition-opacity duration-150 whitespace-nowrap"
          style={{
            color: 'var(--page-text)',
            opacity: activeId === s.id ? 1 : 0.4,
            borderBottom: activeId === s.id ? '2px solid var(--page-accent, var(--page-text))' : '2px solid transparent',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ── Main component ── */

export function PreviewFrame({ mode: externalMode, onModeChange: externalOnModeChange, selectedLinkId, onSelectLink, socials: externalSocials, fillHeight = false }: PreviewFrameProps) {
  const { page } = usePage();
  const { links } = useLinks();
  const { blocks } = useBlocks();
  const embeds = usePageStore((s) => s.embeds);
  const [internalSocials, setInternalSocials] = useState<SocialLink[]>([]);
  const [internalMode, setInternalMode] = useState<PreviewMode>('mobile');
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const mode = externalMode ?? internalMode;
  const onModeChange = externalOnModeChange ?? setInternalMode;
  const interactive = !!onSelectLink;

  const fetchSocials = useCallback(async () => {
    if (externalSocials) return;
    try {
      const res = await fetch('/api/socials', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setInternalSocials(data.data);
    } catch { /* silent */ }
  }, [externalSocials]);

  useEffect(() => { fetchSocials(); }, [fetchSocials]);

  const socials = externalSocials ?? internalSocials;
  const theme: Theme | null = page?.theme ?? null;
  useThemeApplication(previewRef, theme, mode);

  const contentDisplayResolved = theme
    ? (mode === 'desktop' ? resolveDesktopContentDisplay(theme) : resolveContentDisplay(theme))
    : 'flow';

  // Reset section/card state on display mode change
  useEffect(() => {
    setActiveSectionId('');
    setActiveCardIndex(0);
  }, [contentDisplayResolved, mode]);

  // Set initial active section
  useEffect(() => {
    if (!theme?.sectionsConfig?.sections?.length) return;
    if (!activeSectionId) setActiveSectionId(theme.sectionsConfig.sections[0].id);
  }, [theme?.sectionsConfig?.sections, activeSectionId]);

  if (!page || !theme) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface-alt p-12 text-center">
        <p className="font-body text-xs text-brand-text-muted">Loading preview...</p>
      </div>
    );
  }

  const animClass = getAnimationClass(theme.animation);
  const btnStyle = resolveButtonStyle(theme);
  const layout = mode === 'desktop' ? resolveDesktopLayoutVariant(theme) : resolveLayoutVariant(theme);
  const visible = links.filter((l) => l.is_visible);
  const sectionsConfig = theme.sectionsConfig;
  // twoColumn only applies to public page, not preview

  /** Renders links with interactive selection */
  const renderInteractiveLinks = interactive
    ? (linkList: LinkType[], style: ButtonStyle) => (
        <>
          <PageLinks
            links={linkList}
            buttonStyle={style}
            onLinkClick={(id) => onSelectLink!(id)}
            selectedLinkId={selectedLinkId ?? null}
            showOverrideDots
          />
          {visible.length === 0 && <EmptyPlaceholders />}
        </>
      )
    : undefined;

  const heroNode = <PreviewHero page={page} layoutVariant={layout} />;
  const socialsNode = socials.length > 0
    ? <PageSocials socialLinks={socials} layoutVariant={layout} />
    : null;

  const sectionsNode = (
    <PreviewSections
      page={page}
      links={links}
      socialLinks={socials}
      blocks={blocks}
      embeds={embeds}
      layoutVariant={layout}
      {...(renderInteractiveLinks ? { renderLinks: renderInteractiveLinks } : { showPlaceholders: true })}
    />
  );

  const badge = page.show_branding ? <PreviewBadge /> : null;

  /** Render content for sections/cards modes using sectionsConfig */
  function renderSectionsContent() {
    if (!sectionsConfig?.sections?.length) return sectionsNode;

    const sections = sectionsConfig.sections;
    const blockMap = new Map((blocks || []).map((b) => [b.id, b]));

    function renderItems(items: string[]) {
      return items.map((item) => {
        if (item === 'links') {
          if (renderInteractiveLinks) return <div key="links">{renderInteractiveLinks(visible, btnStyle)}</div>;
          return <div key="links"><PageLinks links={links} buttonStyle={btnStyle} /></div>;
        }
        if (item.startsWith('block:')) {
          const block = blockMap.get(item.slice(6));
          if (!block || !block.is_visible) return null;
          const Renderer = blockRendererRegistry[block.block_type as ContentBlockType];
          if (!Renderer) return null;
          return <Renderer key={item} block={block} />;
        }
        return null;
      });
    }

    if (contentDisplayResolved === 'cards') {
      const total = sections.length;
      const activeSection = sections[activeCardIndex] ?? sections[0];

      return (
        <div>
          <div className="min-h-[200px]">
            {activeSection && renderItems(activeSection.items)}
          </div>
          <CardDots count={total} active={activeCardIndex} onDotClick={setActiveCardIndex} />
          {/* Mini arrows for desktop preview */}
          <div className="flex justify-center gap-2 mt-1">
            {activeCardIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setActiveCardIndex(activeCardIndex - 1); }}
                className="p-1 rounded-full"
                style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.15))', color: 'var(--page-text)' }}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}
            {activeCardIndex < total - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setActiveCardIndex(activeCardIndex + 1); }}
                className="p-1 rounded-full"
                style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.15))', color: 'var(--page-text)' }}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Sections mode
    const mode = sectionsConfig.mode ?? 'anchor';
    const currentActive = activeSectionId || sections[0]?.id || '';

    if (mode === 'paginated') {
      const activeSection = sections.find((s) => s.id === currentActive) ?? sections[0];
      return (
        <>
          {sections.length > 1 && (
            <PreviewSectionNav
              sections={sections}
              activeId={currentActive}
              onSelect={setActiveSectionId}
            />
          )}
          <div className="py-2">
            {activeSection && renderItems(activeSection.items)}
          </div>
        </>
      );
    }

    // Anchor mode
    return (
      <>
        {sections.length > 1 && (
          <PreviewSectionNav
            sections={sections}
            activeId={currentActive}
            onSelect={setActiveSectionId}
          />
        )}
        <div className="space-y-6 py-2">
          {sections.map((section) => (
            <div key={section.id}>
              {sections.length > 1 && (
                <p
                  className="font-display text-sm font-700 tracking-tight mb-2"
                  style={{ color: 'var(--page-text)' }}
                >
                  {section.label}
                </p>
              )}
              {renderItems(section.items)}
            </div>
          ))}
        </div>
      </>
    );
  }

  /** Get the main content node for the current display mode */
  function getContentForDisplay() {
    if (contentDisplayResolved === 'sections' || contentDisplayResolved === 'cards') {
      return renderSectionsContent();
    }
    return sectionsNode;
  }

  const mainContent = getContentForDisplay();

  return (
    <div>
      {/* Device toggle */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => onModeChange('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium
            transition-colors duration-150
            ${mode === 'mobile'
              ? 'bg-brand-accent text-white'
              : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface-alt'}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mobile
        </button>
        <button
          onClick={() => onModeChange('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium
            transition-colors duration-150
            ${mode === 'desktop'
              ? 'bg-brand-accent text-white'
              : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface-alt'}`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Desktop
        </button>
      </div>

      {/* Device frame */}
      {mode === 'mobile' ? (
        <MobilePreview
          previewRef={previewRef}
          theme={theme}
          animClass={animClass}
          contentDisplay={contentDisplayResolved}
          heroNode={heroNode}
          socialsNode={socialsNode}
          contentNode={mainContent}
          badge={badge}
          onSelectLink={onSelectLink ?? null}
          fillHeight={fillHeight}
        />
      ) : (
        <DesktopPreview
          previewRef={previewRef}
          theme={theme}
          page={page}
          animClass={animClass}
          layout={layout}
          contentDisplay={contentDisplayResolved}
          heroNode={heroNode}
          socialsNode={socialsNode}
          contentNode={mainContent}
          badge={badge}
          onSelectLink={onSelectLink ?? null}
          fillHeight={fillHeight}
        />
      )}
    </div>
  );
}

/* ── Mobile Preview ── */

function MobilePreview({ previewRef, theme, animClass, contentDisplay,
  heroNode, socialsNode, contentNode, badge, onSelectLink, fillHeight }: {
  previewRef: React.RefObject<HTMLDivElement>;
  theme: Theme;
  animClass: string;
  contentDisplay: string;
  heroNode: React.ReactNode;
  socialsNode: React.ReactNode;
  contentNode: React.ReactNode;
  badge: React.ReactNode;
  onSelectLink: ((id: string | null) => void) | null;
  fillHeight: boolean;
}) {
  const isSpotlight = contentDisplay === 'spotlight';

  const MOBILE_SCALE = 0.85;
  const MOBILE_SCALE_WIDTH = `${100 / MOBILE_SCALE}%`;
  const scaledHeight = (h: number) => Math.round(h / MOBILE_SCALE);
  const MOBILE_CHROME_HEIGHT = 58;
  const MOBILE_FRAME_HEIGHT = Math.round((scaledHeight(620) + MOBILE_CHROME_HEIGHT) * MOBILE_SCALE);

  return (
    <div className="mx-auto" style={{ maxWidth: 375 }}>
      <div
        className="rounded-[2.5rem] border-[3px] border-brand-text/10 overflow-hidden shadow-xl"
        style={{ height: fillHeight ? 'calc(100vh - 200px)' : MOBILE_FRAME_HEIGHT }}
      >
        <div
          key="mobile"
          ref={previewRef}
          data-preview
          data-theme={theme.base}
          className="relative origin-top-left"
          style={{
            background: 'var(--page-bg)',
            color: 'var(--page-text)',
            fontFamily: 'var(--page-font-body)',
            transform: `scale(${MOBILE_SCALE})`,
            width: MOBILE_SCALE_WIDTH,
          }}
        >
          <AnimatedBackground effect={theme.backgroundEffect ?? 'none'} intensity={theme.backgroundIntensity ?? 50} nightSkyConfig={theme.nightSkyConfig} rainConfig={theme.rainConfig} firefliesConfig={theme.firefliesConfig} />
          <div className="relative" style={{ zIndex: 1 }}>
            {/* Status bar */}
            <div className="flex items-center justify-center px-6 pt-3 pb-1">
              <div className="w-[90px] h-[22px] rounded-full bg-black/80" />
            </div>

            {/* Page content */}
            <div
              className={`overflow-y-auto ${animClass}`}
              style={{ height: fillHeight ? `calc((100vh - 240px) / ${MOBILE_SCALE})` : scaledHeight(620) }}
              onClick={onSelectLink ? () => onSelectLink(null) : undefined}
            >
              {isSpotlight ? (
                <>
                  <div className="px-5 flex flex-col justify-center" style={{ minHeight: scaledHeight(530) }}>
                    {heroNode}
                    {socialsNode}
                    <ScrollHint />
                  </div>
                  <div className="px-5 pb-8">
                    {contentNode}
                    {badge}
                  </div>
                </>
              ) : (
                <div className="px-5 py-10">
                  {heroNode}
                  {socialsNode}
                  {contentNode}
                  {badge}
                </div>
              )}
            </div>

            {/* Home indicator */}
            <div className="flex justify-center py-2">
              <div className="w-24 h-1 rounded-full" style={{ background: 'var(--page-text, #000)', opacity: 0.15 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Desktop Preview ── */

function DesktopPreview({ previewRef, theme, page, animClass, layout, contentDisplay,
  heroNode, socialsNode, contentNode, badge, onSelectLink, fillHeight }: {
  previewRef: React.RefObject<HTMLDivElement>;
  theme: Theme;
  page: { username: string; show_branding: boolean };
  animClass: string;
  layout: LayoutVariant;
  contentDisplay: string;
  heroNode: React.ReactNode;
  socialsNode: React.ReactNode;
  contentNode: React.ReactNode;
  badge: React.ReactNode;
  onSelectLink: ((id: string | null) => void) | null;
  fillHeight: boolean;
}) {
  const isSpotlight = contentDisplay === 'spotlight';
  const isSplit = layout === 'left-photo' || layout === 'right-photo';
  const isLeftLayout = layout === 'left-photo';

  const splitGrid = (heroSide: React.ReactNode, contentSide: React.ReactNode) => (
    <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-[7fr_13fr] gap-12 items-start">
      <div className={isLeftLayout ? 'order-1' : 'order-2'}>{heroSide}</div>
      <div className={isLeftLayout ? 'order-2' : 'order-1'}>{contentSide}</div>
    </div>
  );

  return (
    <div
      className="rounded-xl border border-brand-border overflow-hidden shadow-lg mx-auto flex flex-col"
      style={{ maxWidth: 900, maxHeight: fillHeight ? 'calc(100vh - 200px)' : 'calc(100vh - 240px)' }}
    >
      {/* Browser chrome */}
      <div className="shrink-0 bg-brand-surface-alt px-4 py-2.5 border-b border-brand-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>
        <div className="flex-1 ml-2">
          <div className="bg-brand-bg rounded-md px-3 py-1 max-w-xs">
            <span className="font-body text-[10px] text-brand-text-muted">
              bytlinks.com/{page.username}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div style={{ zoom: 0.5 }}>
          <div
            key="desktop"
            ref={previewRef}
            data-preview
            data-theme={theme.base}
            className={`min-h-full ${animClass} relative`}
            style={{
              background: 'var(--page-bg)',
              color: 'var(--page-text)',
              fontFamily: 'var(--page-font-body)',
            }}
            onClick={onSelectLink ? () => onSelectLink(null) : undefined}
          >
            <AnimatedBackground effect={theme.backgroundEffect ?? 'none'} intensity={theme.backgroundIntensity ?? 50} nightSkyConfig={theme.nightSkyConfig} rainConfig={theme.rainConfig} firefliesConfig={theme.firefliesConfig} />
            <div className="relative" style={{ zIndex: 1 }}>
              {(() => {
                if (isSplit) {
                  return splitGrid(
                    <>
                      {heroNode}
                      {socialsNode}
                      {isSpotlight && (
                        <div className="flex flex-col items-center gap-2 mt-6 animate-bounce">
                          <ChevronDown className="w-5 h-5 opacity-40" style={{ color: 'var(--page-text)' }} />
                        </div>
                      )}
                    </>,
                    <>{contentNode}{badge}</>,
                  );
                }

                return (
                  <div className="max-w-lg mx-auto px-8 py-12">
                    {heroNode}
                    {socialsNode}
                    {isSpotlight && (
                      <div className="flex flex-col items-center gap-2 mb-12 animate-bounce">
                        <ChevronDown className="w-5 h-5 opacity-40" style={{ color: 'var(--page-text)' }} />
                      </div>
                    )}
                    {contentNode}
                    {badge}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
