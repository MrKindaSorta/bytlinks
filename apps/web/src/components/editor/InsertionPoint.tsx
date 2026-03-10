import { useState } from 'react';
import { Plus } from 'lucide-react';

interface InsertionPointProps {
  onClick: () => void;
}

/**
 * Thin horizontal line with a centered "+" button.
 * Appears between sections in the visual editor.
 * On desktop: visible on hover. On mobile: always subtly visible.
 */
export function InsertionPoint({ onClick }: InsertionPointProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center py-2 group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Line */}
      <div
        className="absolute left-4 right-4 h-px transition-opacity duration-200"
        style={{
          background: 'var(--page-text, currentColor)',
          opacity: hovered ? 0.2 : 0.06,
        }}
      />

      {/* Plus button — more prominent on mobile (no hover available) */}
      <button
        type="button"
        className="relative z-10 flex items-center justify-center w-7 h-7 lg:w-7 lg:h-7 rounded-full
                   transition-all duration-200 active:scale-110"
        style={{
          background: hovered ? 'var(--page-accent, #0d9488)' : 'var(--page-surface-alt, rgba(128,128,128,0.1))',
          color: hovered ? '#fff' : 'var(--page-text, currentColor)',
          opacity: hovered ? 1 : 0.5,
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
