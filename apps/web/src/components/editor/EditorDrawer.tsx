import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface EditorDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Slide-in drawer from the right (desktop) or bottom (mobile).
 * Used for editing blocks, links, and social links in the My BytLink editor.
 */
export function EditorDrawer({ open, onClose, title, children }: EditorDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

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

  if (!mounted) return null;

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

      {/* Drawer — right side on desktop, bottom on mobile */}
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-brand-surface border-l border-brand-border
                   flex flex-col shadow-xl
                   max-lg:top-auto max-lg:left-0 max-lg:right-0 max-lg:bottom-0 max-lg:max-w-none max-lg:max-h-[80vh]
                   max-lg:rounded-t-2xl max-lg:border-l-0 max-lg:border-t"
        style={{
          transform: visible
            ? 'translateX(0) translateY(0)'
            : window.innerWidth >= 1024
              ? 'translateX(100%)'
              : 'translateY(100%)',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
          <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-alt
                       transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
