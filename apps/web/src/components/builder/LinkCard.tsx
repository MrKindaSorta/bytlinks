import { useState, useMemo } from 'react';
import { GripVertical, Pencil, Trash2, Star, Eye, EyeOff, Check, X, ImagePlus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Link, LinkIconStyle, LinkIconPosition } from '@bytlinks/shared';
import { useLinks } from '../../hooks/useLinks';
import { getLinkIcon } from '../../utils/linkIconMap';
import { LinkIconPicker } from './LinkIconPicker';
import { usePageStore } from '../../store/pageStore';
import { deriveFullPalette, COLOR_PRESETS } from '../../utils/colorDerivation';

interface ThemeColors { bg: string; text: string; accent: string }

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

function StyledLinkIcon({ iconName, style, themeColors }: {
  iconName: string;
  style: LinkIconStyle;
  themeColors: ThemeColors;
}) {
  const Icon = getLinkIcon(iconName);
  if (!Icon) return null;
  const cls = 'w-4 h-4';
  const wrap = 'w-7 h-7 flex items-center justify-center shrink-0';

  switch (style) {
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

interface LinkCardProps {
  link: Link;
}

export function LinkCard({ link }: LinkCardProps) {
  const { editLink, deleteLink } = useLinks();
  const themeColors = usePageThemeColors();
  const [isEditing, setIsEditing] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [error, setError] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const iconStyle: LinkIconStyle = link.style_overrides?.iconStyle ?? 'plain';
  const iconPosition: LinkIconPosition = link.style_overrides?.iconPosition ?? 'left';

  async function handleSave() {
    setError(null);
    try {
      await editLink(link.id, { title, url });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleToggleVisibility() {
    try {
      await editLink(link.id, { is_visible: !link.is_visible });
    } catch {
      // silent
    }
  }

  async function handleToggleFeatured() {
    try {
      await editLink(link.id, { is_featured: !link.is_featured });
    } catch {
      // silent
    }
  }

  async function handleDelete() {
    try {
      await deleteLink(link.id);
    } catch {
      // silent
    }
  }

  async function handleIconChange(icon: string | null) {
    try {
      await editLink(link.id, { icon });
    } catch {
      // silent
    }
  }

  async function handleIconStyleChange(s: LinkIconStyle) {
    try {
      await editLink(link.id, {
        style_overrides: { ...link.style_overrides, iconStyle: s },
      });
    } catch {
      // silent
    }
  }

  async function handleIconPositionChange(p: LinkIconPosition) {
    try {
      await editLink(link.id, {
        style_overrides: { ...link.style_overrides, iconPosition: p },
      });
    } catch {
      // silent
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border bg-brand-surface p-4 group
        ${link.is_visible ? 'border-brand-border' : 'border-dashed border-brand-border opacity-60'}`}
    >
      {isEditing ? (
        <div className="space-y-2">
          {error && <p className="font-body text-xs text-red-600">{error}</p>}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full font-body text-base md:text-sm px-3 py-2 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text
                       focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            autoFocus
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full font-body text-base md:text-sm px-3 py-2 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text
                       focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 font-body text-xs font-medium px-3 py-1.5 rounded-lg
                         bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button
              onClick={() => { setIsEditing(false); setTitle(link.title); setUrl(link.url); }}
              className="flex items-center gap-1 font-body text-xs font-medium px-3 py-1.5 rounded-lg
                         text-brand-text-secondary transition-colors duration-fast hover:text-brand-text"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-brand-text-muted
                       hover:text-brand-text-secondary transition-colors duration-fast"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Icon button */}
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className={`shrink-0 transition-colors duration-fast
              ${link.icon
                ? ''
                : 'w-7 h-7 flex items-center justify-center rounded-lg border border-dashed border-brand-border text-brand-text-muted hover:border-brand-accent hover:text-brand-accent'}`}
            title={link.icon ? 'Change icon' : 'Add icon'}
          >
            {link.icon ? (
              <span className="rounded-md p-0.5" style={iconStyle !== 'plain' ? { backgroundColor: themeColors.bg } : undefined}>
                <StyledLinkIcon iconName={link.icon} style={iconStyle} themeColors={themeColors} />
              </span>
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-medium text-brand-text truncate">
              {link.title}
            </p>
            <p className="font-body text-xs text-brand-text-muted truncate">
              {link.url}
            </p>
          </div>

          {/* Featured badge */}
          {link.is_featured ? (
            <span className="font-body text-xs font-medium text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded">
              Featured
            </span>
          ) : null}

          {/* Click count */}
          <span className="font-body text-xs text-brand-text-muted tabular-nums">
            {link.click_count} clicks
          </span>

          {/* Actions — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
            <button
              onClick={handleToggleFeatured}
              className="p-1.5 rounded-md text-brand-text-muted hover:text-brand-accent
                         transition-colors duration-fast"
              aria-label={link.is_featured ? 'Remove from featured' : 'Add to featured'}
              title={link.is_featured ? 'Remove from featured' : 'Feature this link'}
            >
              <Star className={`w-4 h-4 ${link.is_featured ? 'fill-current text-brand-accent' : ''}`} />
            </button>
            <button
              onClick={handleToggleVisibility}
              className="p-1.5 rounded-md text-brand-text-muted hover:text-brand-text
                         transition-colors duration-fast"
              aria-label={link.is_visible ? 'Hide link' : 'Show link'}
            >
              {link.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md text-brand-text-muted hover:text-brand-text
                         transition-colors duration-fast"
              aria-label="Edit link"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md text-brand-text-muted hover:text-red-600
                         transition-colors duration-fast"
              aria-label="Delete link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Icon picker panel */}
      {showIconPicker && (
        <LinkIconPicker
          icon={link.icon}
          iconStyle={iconStyle}
          iconPosition={iconPosition}
          onChangeIcon={(icon) => handleIconChange(icon)}
          onChangeStyle={handleIconStyleChange}
          onChangePosition={handleIconPositionChange}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
