import { useState, useRef } from 'react';
import { GripVertical, Pencil, Eye, EyeOff, Trash2, Columns2, Square } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EditableWrapperProps {
  /** Unique ID for DnD (e.g., 'links', 'block:abc123', 'social_links') */
  id: string;
  children: React.ReactNode;
  /** Label shown in toolbar tooltip */
  label: string;
  /** Whether this is a built-in section (links, social_links) — can't delete */
  isBuiltIn?: boolean;
  /** Visibility state */
  isVisible?: boolean;
  /** Callback to open the editor drawer */
  onEdit?: () => void;
  /** Callback to toggle visibility */
  onToggleVisibility?: () => void;
  /** Callback to delete */
  onDelete?: () => void;
  /** Whether DnD is enabled for this item */
  draggable?: boolean;
  /** Whether this item is currently selected/active */
  isSelected?: boolean;
  /** Callback when tapped/clicked (for mobile selection) */
  onSelect?: () => void;
  /** Current column span ('full' or 'half') — shown only when 2-col grid is active */
  columnSpan?: 'full' | 'half';
  /** Callback to toggle column span */
  onToggleColumnSpan?: () => void;
}

/**
 * Wraps a rendered section with hover/tap edit controls.
 * Shows a subtle outline and floating toolbar on interaction.
 */
export function EditableWrapper({
  id,
  children,
  label,
  isBuiltIn,
  isVisible = true,
  onEdit,
  onToggleVisibility,
  onDelete,
  draggable = true,
  isSelected,
  onSelect,
  columnSpan,
  onToggleColumnSpan,
}: EditableWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const active = hovered || isSelected;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : isVisible ? 1 : 0.4,
  };

  function handleTap(e: React.MouseEvent) {
    // Don't trigger on toolbar button clicks
    if ((e.target as HTMLElement).closest('[data-toolbar]')) return;
    onSelect?.();
  }

  return (
    <div
      ref={(el) => { setNodeRef(el); (wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}
      style={style}
      className="relative group/editable"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleTap}
    >
      {/* Outline highlight */}
      <div
        className="absolute -inset-1.5 rounded-xl pointer-events-none transition-all duration-200"
        style={{
          border: active ? '1.5px dashed var(--page-accent, #0d9488)' : '1.5px dashed transparent',
          opacity: active ? 0.5 : 0,
        }}
      />

      {/* Floating toolbar — desktop only (mobile uses MobileActionBar) */}
      <div
        data-toolbar
        className="absolute -top-3 right-2 z-20 hidden lg:flex items-center gap-0.5 px-1.5 py-1 rounded-lg
                   shadow-lg transition-all duration-200 pointer-events-auto"
        style={{
          background: 'var(--page-surface, #fff)',
          border: '1px solid var(--page-border, rgba(0,0,0,0.08))',
          opacity: active ? 1 : 0,
          transform: active ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.95)',
          pointerEvents: active ? 'auto' : 'none',
        }}
      >
        {/* Section label */}
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 select-none"
          style={{ color: 'var(--page-text-secondary, rgba(0,0,0,0.4))' }}
        >
          {label}
        </span>

        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--page-border, rgba(0,0,0,0.08))' }} />

        {/* Drag handle */}
        {draggable && (
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded cursor-grab active:cursor-grabbing transition-colors duration-150"
            style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Edit */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded transition-colors duration-150 hover:opacity-70"
            style={{ color: 'var(--page-accent, #0d9488)' }}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Column span toggle (2-col grid only) */}
        {onToggleColumnSpan && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleColumnSpan(); }}
            className="p-1 rounded transition-colors duration-150 hover:opacity-70"
            style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
            title={columnSpan === 'full' ? 'Half width' : 'Full width'}
          >
            {columnSpan === 'full' ? <Square className="w-3.5 h-3.5" /> : <Columns2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Visibility toggle */}
        {!isBuiltIn && onToggleVisibility && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            className="p-1 rounded transition-colors duration-150 hover:opacity-70"
            style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Delete */}
        {!isBuiltIn && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded transition-colors duration-150"
            style={{ color: '#ef4444' }}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`relative ${isDragging ? 'pointer-events-none' : ''}`}>
        {children}
        {/* Mobile interaction shield — blocks touches from reaching interactive content
            (e.g. embedded videos, iframes) so taps select the section instead.
            Desktop uses hover controls so no shield needed. */}
        <div
          className="absolute inset-0 z-10 lg:hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
