import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface InlineTextEditProps {
  value: string;
  onSave: (value: string) => void;
  /** Render the display version. */
  children: React.ReactNode;
  /** 'input' for single line, 'textarea' for multiline. */
  multiline?: boolean;
  /** Max character length. */
  maxLength?: number;
  /** Placeholder when empty. */
  placeholder?: string;
  /** Additional class for the edit container. */
  className?: string;
}

/**
 * Wraps any text element with a click-to-edit capability.
 * Shows a subtle pencil icon on hover. Click to switch to input mode.
 * Saves on Enter (input) or blur. Cancel with Escape.
 */
export function InlineTextEdit({
  value,
  onSave,
  children,
  multiline,
  maxLength,
  placeholder,
  className = '',
}: InlineTextEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
  }

  if (editing) {
    const inputStyle: React.CSSProperties = {
      background: 'rgba(0,0,0,0.06)',
      color: 'inherit',
      fontFamily: 'inherit',
      fontWeight: 'inherit',
      letterSpacing: 'inherit',
      lineHeight: 'inherit',
      textAlign: 'inherit' as const,
      border: '1.5px solid var(--page-accent, #0d9488)',
      borderRadius: '6px',
      padding: '4px 8px',
      width: '100%',
      outline: 'none',
    };

    return (
      <div className={`relative ${className}`}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            placeholder={placeholder}
            rows={3}
            className="text-base md:[font-size:inherit]"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            placeholder={placeholder}
            className="text-base md:[font-size:inherit]"
            style={inputStyle}
          />
        )}
        <div className="flex items-center gap-1 mt-1.5 justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-150"
            style={{
              background: 'var(--page-accent, #0d9488)',
              color: '#fff',
            }}
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-150"
            style={{
              color: 'var(--page-text-secondary, rgba(0,0,0,0.5))',
            }}
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group/inline relative cursor-pointer ${className}`}
      onClick={() => setEditing(true)}
    >
      {children}
      {/* Pencil icon on hover */}
      <span
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/inline:opacity-70
                   transition-opacity duration-150 pointer-events-none"
        style={{ color: 'var(--page-accent, #0d9488)' }}
      >
        <Pencil className="w-3.5 h-3.5" />
      </span>
    </div>
  );
}
