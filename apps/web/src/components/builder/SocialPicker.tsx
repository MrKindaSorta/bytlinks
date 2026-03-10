import { useState, useCallback, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import {
  Plus, Trash2, GripVertical, ChevronDown, Check,
  Twitter, Github, Linkedin, Youtube, Instagram, Music2,
  MessageCircle, Twitch, AtSign, Cloud, Mail, Globe,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SOCIAL_PLATFORMS, SOCIAL_ICON_STYLES } from '@bytlinks/shared/constants';
import type { SocialLink, SocialPlatform, SocialIconStyle } from '@bytlinks/shared';
import { usePageStore } from '../../store/pageStore';
import { deriveFullPalette, COLOR_PRESETS } from '../../utils/colorDerivation';

/* ───── Icon map ───── */

const ICON_MAP: Record<SocialPlatform, React.FC<{ className?: string }>> = {
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

/* ───── Resolve page theme colors ───── */

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
      const palette = deriveFullPalette(
        theme.customColors.primary,
        theme.customColors.accent,
        theme.customColors.text,
      );
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

/* ───── Styled icon renderer ───── */

function StyledSocialIcon({
  platform,
  iconStyle,
  size = 'md',
  themeColors,
}: {
  platform: SocialPlatform;
  iconStyle: SocialIconStyle;
  size?: 'sm' | 'md';
  themeColors: ThemeColors;
}) {
  const Icon = ICON_MAP[platform] ?? Globe;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const wrapperBase = size === 'sm'
    ? 'w-7 h-7 flex items-center justify-center shrink-0'
    : 'w-8 h-8 flex items-center justify-center shrink-0';

  switch (iconStyle) {
    case 'circle-outline':
      return (
        <span
          className={`${wrapperBase} rounded-full`}
          style={{ border: `2px solid ${themeColors.text}`, color: themeColors.text }}
        >
          <Icon className={iconSize} />
        </span>
      );
    case 'circle-filled':
      return (
        <span
          className={`${wrapperBase} rounded-full`}
          style={{ backgroundColor: themeColors.text, color: themeColors.bg }}
        >
          <Icon className={iconSize} />
        </span>
      );
    case 'square-outline':
      return (
        <span
          className={`${wrapperBase} rounded-md`}
          style={{ border: `2px solid ${themeColors.text}`, color: themeColors.text }}
        >
          <Icon className={iconSize} />
        </span>
      );
    case 'square-filled':
      return (
        <span
          className={`${wrapperBase} rounded-md`}
          style={{ backgroundColor: themeColors.text, color: themeColors.bg }}
        >
          <Icon className={iconSize} />
        </span>
      );
    default: // plain
      return (
        <span className={wrapperBase} style={{ color: themeColors.text }}>
          <Icon className={iconSize} />
        </span>
      );
  }
}

/* ───── Icon style picker popover (animated) ───── */

function IconStylePicker({
  platform,
  current,
  onSelect,
  themeColors,
}: {
  platform: SocialPlatform;
  current: SocialIconStyle;
  onSelect: (style: SocialIconStyle) => void;
  themeColors: ThemeColors;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function openPopover() {
    setMounted(true);
    // Defer visibility to next frame so CSS transition triggers
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function closePopover() {
    setVisible(false);
  }

  function handleTransitionEnd() {
    if (!visible) setMounted(false);
  }

  // Measure space and flip if needed
  useLayoutEffect(() => {
    if (!mounted || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDropUp(spaceBelow < 260 && spaceAbove > spaceBelow);
  }, [mounted]);

  // Click outside
  useEffect(() => {
    if (!mounted) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closePopover();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mounted]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => mounted ? closePopover() : openPopover()}
        className="rounded-lg transition-colors duration-fast hover:bg-brand-surface-alt p-0.5"
        aria-label="Change icon style"
      >
        <StyledSocialIcon platform={platform} iconStyle={current} themeColors={themeColors} />
      </button>

      {mounted && (
        <div
          ref={popoverRef}
          className={`absolute left-0 z-30 rounded-xl border border-brand-border
                      bg-brand-surface shadow-lg p-2 min-w-[260px]
                      ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? 'translateY(0) scale(1)'
              : dropUp ? 'translateY(6px) scale(0.97)' : 'translateY(-6px) scale(0.97)',
            transformOrigin: dropUp ? 'bottom left' : 'top left',
            transition: 'opacity 180ms ease, transform 180ms ease',
            pointerEvents: visible ? 'auto' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          <p className="font-body text-[11px] font-semibold uppercase tracking-wider
                        text-brand-text-muted px-2 pb-1.5">
            Icon Style
          </p>
          <div className="space-y-0.5">
            {ICON_STYLE_KEYS.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => { onSelect(style); closePopover(); }}
                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg
                            transition-colors duration-fast
                            ${style === current
                              ? 'bg-brand-accent/10'
                              : 'hover:bg-brand-surface-alt'}`}
              >
                <span
                  className="rounded-md p-1 shrink-0"
                  style={{ backgroundColor: themeColors.bg }}
                >
                  <StyledSocialIcon platform={platform} iconStyle={style} size="sm" themeColors={themeColors} />
                </span>
                <span className={`font-body text-sm ${style === current ? 'text-brand-accent font-medium' : 'text-brand-text'}`}>
                  {SOCIAL_ICON_STYLES[style].label}
                </span>
                {style === current && <Check className="w-3.5 h-3.5 ml-auto text-brand-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Custom platform dropdown ───── */

function PlatformDropdown({
  value,
  onChange,
  excludePlatforms,
}: {
  value: SocialPlatform;
  onChange: (p: SocialPlatform) => void;
  excludePlatforms: Set<string>;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const available = (Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).filter(
    (k) => !excludePlatforms.has(k),
  );

  function openDropdown() {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function closeDropdown() {
    setVisible(false);
  }

  function handleTransitionEnd() {
    if (!visible) setMounted(false);
  }

  useEffect(() => {
    if (!mounted) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeDropdown();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mounted]);

  const CurrentIcon = ICON_MAP[value] ?? Globe;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => mounted ? closeDropdown() : openDropdown()}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-brand-border
                   bg-brand-bg text-brand-text font-body text-sm
                   transition-colors duration-fast
                   hover:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
      >
        <CurrentIcon className="w-4 h-4 text-brand-text-secondary shrink-0" />
        <span className="flex-1 text-left">
          {SOCIAL_PLATFORMS[value]?.label ?? value}
        </span>
        <ChevronDown className={`w-4 h-4 text-brand-text-muted transition-transform duration-200
                                 ${visible ? 'rotate-180' : ''}`} />
      </button>

      {mounted && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-64 overflow-y-auto
                     rounded-xl border border-brand-border bg-brand-surface shadow-lg py-1.5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
            transformOrigin: 'top center',
            transition: 'opacity 180ms ease, transform 180ms ease',
            pointerEvents: visible ? 'auto' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {available.map((key) => {
            const Icon = ICON_MAP[key] ?? Globe;
            const selected = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); closeDropdown(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2
                            transition-colors duration-fast font-body text-sm
                            ${selected
                              ? 'bg-brand-accent/10 text-brand-accent'
                              : 'hover:bg-brand-surface-alt text-brand-text'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">
                  {SOCIAL_PLATFORMS[key].label}
                </span>
                {selected && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───── Sortable social card ───── */

interface SortableSocialCardProps {
  social: SocialLink;
  onDelete: (id: string) => void;
  onUpdateIconStyle: (id: string, style: SocialIconStyle) => void;
  themeColors: ThemeColors;
}

function SortableSocialCard({ social, onDelete, onUpdateIconStyle, themeColors }: SortableSocialCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: social.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-surface px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-brand-text-muted
                   hover:text-brand-text-secondary transition-colors duration-fast"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <IconStylePicker
        platform={social.platform as SocialPlatform}
        current={(social.icon_style as SocialIconStyle) ?? 'plain'}
        onSelect={(s) => onUpdateIconStyle(social.id, s)}
        themeColors={themeColors}
      />

      <span className="font-body text-sm font-medium text-brand-text w-24">
        {SOCIAL_PLATFORMS[social.platform as keyof typeof SOCIAL_PLATFORMS]?.label ?? social.platform}
      </span>
      <span className="font-body text-xs text-brand-text-muted truncate flex-1">
        {social.url}
      </span>
      <button
        onClick={() => onDelete(social.id)}
        className="p-1.5 rounded-md text-brand-text-muted hover:text-red-600
                   transition-colors duration-fast"
        aria-label={`Delete ${social.platform}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ───── Main component ───── */

export function SocialPicker() {
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>('x');
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const themeColors = usePageThemeColors();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchSocials = useCallback(async () => {
    try {
      const res = await fetch('/api/socials', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSocials(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocials();
  }, [fetchSocials]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = socials.findIndex((s) => s.id === active.id);
    const newIndex = socials.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...socials];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const withOrder = reordered.map((s, i) => ({ ...s, order_num: i }));
    setSocials(withOrder);

    const order = withOrder.map((s, i) => ({ id: s.id, order_num: i }));
    fetch('/api/socials/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ order }),
    }).catch(() => {});
  }

  async function handleUpdateIconStyle(id: string, iconStyle: SocialIconStyle) {
    setSocials((prev) =>
      prev.map((s) => (s.id === id ? { ...s, icon_style: iconStyle } : s)),
    );

    try {
      await fetch(`/api/socials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon_style: iconStyle }),
      });
    } catch {
      // silent — optimistic update already applied
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl) return;

    try {
      const res = await fetch('/api/socials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: newPlatform, url: newUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSocials((prev) => [...prev, data.data]);
        setNewUrl('');
        setIsAdding(false);
      }
    } catch {
      // silent
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/socials/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setSocials((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // silent
    }
  }

  const usedPlatforms = new Set(socials.map((s) => s.platform));

  // When opening the add form, default to the first unused platform
  function openAddForm() {
    const available = (Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).filter(
      (k) => !usedPlatforms.has(k),
    );
    if (available.length > 0) setNewPlatform(available[0]);
    setIsAdding(true);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-brand-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Existing social links — sortable */}
      {socials.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={socials.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {socials.map((social) => (
                <SortableSocialCard
                  key={social.id}
                  social={social}
                  onDelete={handleDelete}
                  onUpdateIconStyle={handleUpdateIconStyle}
                  themeColors={themeColors}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

      {/* Add new */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="rounded-lg border border-brand-border bg-brand-surface p-4 space-y-3">
          <PlatformDropdown
            value={newPlatform}
            onChange={setNewPlatform}
            excludePlatforms={usedPlatforms}
          />

          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
            className="w-full font-body text-sm px-3 py-2 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text placeholder:text-brand-text-muted
                       focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            placeholder="https://..."
            autoFocus
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="font-body text-sm font-semibold px-4 py-2 rounded-lg
                         bg-brand-accent text-white
                         transition-colors duration-fast hover:bg-brand-accent-hover"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="font-body text-sm font-medium px-4 py-2 rounded-lg
                         text-brand-text-secondary transition-colors duration-fast hover:text-brand-text"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={openAddForm}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                     border border-dashed border-brand-border bg-brand-surface
                     font-body text-sm font-medium text-brand-text-secondary
                     transition-colors duration-fast hover:border-brand-accent hover:text-brand-accent"
        >
          <Plus className="w-4 h-4" />
          Add social link
        </button>
      )}
    </div>
  );
}
