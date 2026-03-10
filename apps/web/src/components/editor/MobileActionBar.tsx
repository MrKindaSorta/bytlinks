import { Pencil, ArrowUp, ArrowDown, Eye, EyeOff, Star, Copy, Trash2, X } from 'lucide-react';

interface ActionButtonProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}

function ActionButton({ icon: Icon, label, onClick, disabled, active, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg
                 transition-colors duration-150 active:scale-95"
      style={{
        opacity: disabled ? 0.3 : 1,
        color: danger
          ? '#ef4444'
          : active
            ? 'var(--page-accent, #0d9488)'
            : 'var(--page-text, currentColor)',
      }}
    >
      <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
      <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{label}</span>
    </button>
  );
}

export interface MobileActionBarProps {
  visible: boolean;
  label: string;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleVisibility?: () => void;
  onToggleFeatured?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onDeselect: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isVisible?: boolean;
  isFeatured?: boolean;
}

export function MobileActionBar({
  visible,
  label,
  onEdit,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onToggleFeatured,
  onDuplicate,
  onDelete,
  onDeselect,
  canMoveUp,
  canMoveDown,
  isVisible,
  isFeatured,
}: MobileActionBarProps) {
  return (
    <div
      data-mobile-action-bar
      className="fixed left-3 right-3 z-[55] lg:hidden"
      style={{
        bottom: 68,
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 80px))',
        opacity: visible ? 1 : 0,
        transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--page-surface, #fff)',
          border: '1px solid var(--page-border, rgba(0,0,0,0.08))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        {/* Label row */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '1px solid var(--page-border, rgba(0,0,0,0.06))' }}
        >
          <span
            className="font-body text-[11px] font-semibold truncate"
            style={{ color: 'var(--page-text-secondary, rgba(0,0,0,0.5))' }}
          >
            {label}
          </span>
          <button
            onClick={onDeselect}
            className="p-1 rounded-md shrink-0 active:scale-90 transition-transform duration-100"
            style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-around px-1 py-1.5">
          {onEdit && <ActionButton icon={Pencil} label="Edit" onClick={onEdit} />}
          {onMoveUp !== undefined && (
            <ActionButton icon={ArrowUp} label="Up" onClick={onMoveUp ?? (() => {})} disabled={!canMoveUp} />
          )}
          {onMoveDown !== undefined && (
            <ActionButton icon={ArrowDown} label="Down" onClick={onMoveDown ?? (() => {})} disabled={!canMoveDown} />
          )}
          {onToggleFeatured && (
            <ActionButton
              icon={Star}
              label={isFeatured ? 'Unfave' : 'Fave'}
              onClick={onToggleFeatured}
              active={isFeatured}
            />
          )}
          {onToggleVisibility && (
            <ActionButton
              icon={isVisible ? Eye : EyeOff}
              label={isVisible ? 'Hide' : 'Show'}
              onClick={onToggleVisibility}
            />
          )}
          {onDuplicate && <ActionButton icon={Copy} label="Copy" onClick={onDuplicate} />}
          {onDelete && <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />}
        </div>
      </div>
    </div>
  );
}
