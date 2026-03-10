import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { LINK_ICONS, LINK_ICON_STYLES, LINK_ICON_POSITIONS } from '@bytlinks/shared/constants';
import type { LinkIconStyle, LinkIconPosition } from '@bytlinks/shared';
import { getLinkIcon } from '../../utils/linkIconMap';
import { usePageStore } from '../../store/pageStore';
import { deriveFullPalette, COLOR_PRESETS } from '../../utils/colorDerivation';

/* ── Resolve real page theme colors ── */

interface ThemeColors {
  bg: string;
  text: string;
  accent: string;
}

function usePageThemeColors(): ThemeColors {
  const page = usePageStore((s) => s.page);
  return useMemo(() => {
    const fallback: ThemeColors = { bg: '#ffffff', text: '#1c1917', accent: '#1c1917' };
    if (!page?.theme) return fallback;
    const theme = page.theme;
    if (theme.colorMode === 'custom-simple' && theme.customColors) {
      const palette = deriveFullPalette(theme.customColors.primary, theme.customColors.accent, theme.customColors.text);
      return { bg: palette.bg, text: palette.text, accent: palette.accent };
    }
    if (theme.colorMode === 'preset' && theme.preset) {
      const preset = COLOR_PRESETS[theme.preset];
      if (preset) {
        const palette = deriveFullPalette(preset[0], preset[1], preset[2]);
        return { bg: palette.bg, text: palette.text, accent: palette.accent };
      }
    }
    return fallback;
  }, [page?.theme]);
}

/* ── Theme-styled icon for the grid ── */

function StyledGridIcon({
  iconName,
  iconStyle,
  themeColors,
}: {
  iconName: string;
  iconStyle: LinkIconStyle;
  themeColors: ThemeColors;
}) {
  const Icon = getLinkIcon(iconName);
  if (!Icon) return null;
  const cls = 'w-4 h-4';
  const wrap = 'w-7 h-7 flex items-center justify-center';

  switch (iconStyle) {
    case 'circle-outline':
      return (
        <span className={`${wrap} rounded-full`} style={{ border: `1.5px solid ${themeColors.text}`, color: themeColors.text }}>
          <Icon className={cls} />
        </span>
      );
    case 'circle-filled':
      return (
        <span className={`${wrap} rounded-full`} style={{ backgroundColor: themeColors.text, color: themeColors.bg }}>
          <Icon className={cls} />
        </span>
      );
    case 'square-outline':
      return (
        <span className={`${wrap} rounded-[4px]`} style={{ border: `1.5px solid ${themeColors.text}`, color: themeColors.text }}>
          <Icon className={cls} />
        </span>
      );
    case 'square-filled':
      return (
        <span className={`${wrap} rounded-[4px]`} style={{ backgroundColor: themeColors.text, color: themeColors.bg }}>
          <Icon className={cls} />
        </span>
      );
    default:
      return (
        <span className={wrap} style={{ color: themeColors.text }}>
          <Icon className={cls} />
        </span>
      );
  }
}

/* ── Animated collapsible wrapper for category grids ── */

function AnimatedCollapse({
  open,
  children,
  onOpenComplete,
}: {
  open: boolean;
  children: React.ReactNode;
  onOpenComplete?: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const [renderChildren, setRenderChildren] = useState(open);
  const wasOpen = useRef(open);

  if (open && !renderChildren) setRenderChildren(true);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    setHeight(open ? contentRef.current.scrollHeight : 0);
  }, [open, renderChildren]);

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== 'height') return;
    if (!open) {
      setRenderChildren(false);
    } else {
      onOpenComplete?.();
    }
    wasOpen.current = open;
  }

  useEffect(() => {
    wasOpen.current = open;
  }, [open]);

  return (
    <div
      style={{
        height,
        opacity: open ? 1 : 0,
        overflow: 'hidden',
        transition: 'height 200ms ease, opacity 150ms ease',
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {renderChildren && <div ref={contentRef}>{children}</div>}
    </div>
  );
}

/* ── Main picker ── */

interface LinkIconPickerProps {
  icon: string | null;
  iconStyle: LinkIconStyle;
  iconPosition: LinkIconPosition;
  onChangeIcon: (icon: string | null) => void;
  onChangeStyle: (style: LinkIconStyle) => void;
  onChangePosition: (position: LinkIconPosition) => void;
  onClose: () => void;
}

const PANEL_HEIGHT = 420;
const STYLE_KEYS = Object.keys(LINK_ICON_STYLES) as LinkIconStyle[];
const POSITION_KEYS = Object.keys(LINK_ICON_POSITIONS) as LinkIconPosition[];
const CATEGORIES = Object.entries(LINK_ICONS) as [string, { label: string; icons: readonly string[] }][];

export function LinkIconPicker({
  icon,
  iconStyle,
  iconPosition,
  onChangeIcon,
  onChangeStyle,
  onChangePosition,
  onClose,
}: LinkIconPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dropUp, setDropUp] = useState(false);
  const [animState, setAnimState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const pendingScrollKey = useRef<string | null>(null);
  const themeColors = usePageThemeColors();

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const parent = panelRef.current.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const spaceBelow = window.innerHeight - parentRect.bottom;
    const spaceAbove = parentRect.top;
    if (spaceBelow < PANEL_HEIGHT && spaceAbove > spaceBelow) {
      setDropUp(true);
    }
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimState('visible'));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setAnimState('exiting');
  }, []);

  function handlePanelTransitionEnd() {
    if (animState === 'exiting') onClose();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [handleClose]);

  function handleCategoryOpenComplete(key: string) {
    if (pendingScrollKey.current !== key) return;
    pendingScrollKey.current = null;

    const header = headerRefs.current[key];
    const container = scrollRef.current;
    if (!header || !container) return;

    const headerRect = header.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = headerRect.top - containerRect.top;
    const targetScroll = container.scrollTop + relativeTop - 8;
    container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }

  const isVisible = animState === 'visible';
  const isStyled = iconStyle !== 'plain';

  const lowerSearch = search.toLowerCase();
  const filteredCategories = CATEGORIES.map(([key, cat]) => ({
    key,
    label: cat.label,
    icons: cat.icons.filter((name) => name.includes(lowerSearch)),
  })).filter((c) => c.icons.length > 0);

  return (
    <div
      ref={panelRef}
      className={`absolute left-0 right-0 z-50 rounded-xl border border-brand-border
                  bg-brand-surface shadow-xl overflow-hidden
                  ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
      style={{
        maxHeight: PANEL_HEIGHT,
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateY(0) scale(1)'
          : dropUp
            ? 'translateY(8px) scale(0.97)'
            : 'translateY(-8px) scale(0.97)',
        transformOrigin: dropUp ? 'bottom center' : 'top center',
        transition: 'opacity 180ms ease, transform 180ms ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      onTransitionEnd={handlePanelTransitionEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border">
        <span className="font-body text-xs font-semibold text-brand-text">Choose Icon</span>
        <button onClick={handleClose} className="p-1 rounded text-brand-text-muted hover:text-brand-text transition-colors duration-150">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Style + position row */}
      <div className="px-3 py-2 border-b border-brand-border space-y-2">
        <div>
          <span className="font-body text-[10px] uppercase tracking-wider text-brand-text-muted">Style</span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {STYLE_KEYS.map((s) => (
              <button
                key={s}
                onClick={() => onChangeStyle(s)}
                className={`px-2 py-1 rounded font-body text-[10px] transition-colors duration-150
                  ${iconStyle === s
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'}`}
              >
                {LINK_ICON_STYLES[s].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="font-body text-[10px] uppercase tracking-wider text-brand-text-muted">Position</span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {POSITION_KEYS.map((p) => (
              <button
                key={p}
                onClick={() => onChangePosition(p)}
                className={`px-2 py-1 rounded font-body text-[10px] transition-colors duration-150
                  ${iconPosition === p
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'}`}
              >
                {LINK_ICON_POSITIONS[p].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-brand-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-brand-bg border border-brand-border">
          <Search className="w-3.5 h-3.5 text-brand-text-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="flex-1 bg-transparent font-body text-xs text-brand-text placeholder:text-brand-text-muted
                       focus:outline-none"
          />
        </div>
      </div>

      {/* Remove icon */}
      {icon && (
        <div className="px-3 pt-2">
          <button
            onClick={() => onChangeIcon(null)}
            className="font-body text-[10px] text-red-500 hover:text-red-400 transition-colors duration-150"
          >
            Remove icon
          </button>
        </div>
      )}

      {/* Icon grid */}
      <div ref={scrollRef} className="overflow-y-auto px-3 py-2 space-y-1" style={{ maxHeight: 240 }}>
        {filteredCategories.map((cat) => {
          const isOpen = activeCategory === cat.key || !!search;
          return (
            <div key={cat.key}>
              <button
                ref={(el) => { headerRefs.current[cat.key] = el; }}
                onClick={() => {
                  const opening = activeCategory !== cat.key;
                  setActiveCategory(opening ? cat.key : null);
                  if (opening) {
                    pendingScrollKey.current = cat.key;
                  }
                }}
                className="flex items-center gap-1 w-full font-body text-[10px] uppercase tracking-wider
                           text-brand-text-muted hover:text-brand-text transition-colors duration-150 py-0.5"
              >
                <ChevronDown
                  className="w-3 h-3 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}
                />
                {cat.label}
                <span className="text-brand-text-muted/50 ml-1">({cat.icons.length})</span>
              </button>
              <AnimatedCollapse
                open={isOpen}
                onOpenComplete={() => handleCategoryOpenComplete(cat.key)}
              >
                <div
                  className={`grid gap-1 pb-1 pt-0.5 ${isStyled ? 'grid-cols-6' : 'grid-cols-8'}`}
                  style={isStyled ? { backgroundColor: themeColors.bg, borderRadius: 8, padding: 6 } : undefined}
                >
                  {cat.icons.map((name) => {
                    const isSelected = icon === name;

                    if (isStyled) {
                      return (
                        <button
                          key={name}
                          onClick={() => onChangeIcon(name)}
                          title={name}
                          className="flex items-center justify-center rounded-lg transition-opacity duration-150 hover:opacity-80"
                          style={{
                            outline: isSelected ? `2px solid ${themeColors.accent}` : 'none',
                            outlineOffset: 1,
                            borderRadius: 8,
                          }}
                        >
                          <StyledGridIcon iconName={name} iconStyle={iconStyle} themeColors={themeColors} />
                        </button>
                      );
                    }

                    const IconComp = getLinkIcon(name);
                    if (!IconComp) return null;
                    return (
                      <button
                        key={name}
                        onClick={() => onChangeIcon(name)}
                        title={name}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150
                          ${isSelected
                            ? 'bg-brand-accent text-white'
                            : 'text-brand-text-secondary hover:bg-brand-surface-alt hover:text-brand-text'}`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </AnimatedCollapse>
            </div>
          );
        })}
        {filteredCategories.length === 0 && (
          <p className="font-body text-xs text-brand-text-muted text-center py-4">No icons found</p>
        )}
      </div>
    </div>
  );
}
