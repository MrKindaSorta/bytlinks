import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  placeholder?: string;
}

export function TagInput({ tags, onChange, max = 10, placeholder = 'Add a keyword...' }: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = tags.length >= max;

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tag.length > 30) return;
    if (tags.length >= max) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...tags, tag]);
    setInput('');
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Auto-add if comma typed
    if (val.includes(',')) {
      val.split(',').forEach((part) => addTag(part));
      return;
    }
    setInput(val);
  }

  return (
    <div>
      <div
        className="w-full flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-brand-border
                   bg-brand-surface min-h-[38px] cursor-text
                   focus-within:ring-2 focus-within:ring-brand-accent/30 focus-within:border-transparent
                   transition-all duration-fast"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 bg-brand-surface-alt border border-brand-border
                       text-brand-text-secondary text-xs rounded-full px-2 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="text-brand-text-muted hover:text-brand-text transition-colors duration-fast"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!atLimit && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] font-body text-sm text-brand-text bg-transparent
                       outline-none placeholder:text-brand-text-muted"
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-body text-xs text-brand-text-muted">
          Press comma or Enter to add
        </span>
        <span className={`font-body text-xs ${tags.length >= max ? 'text-amber-600' : 'text-brand-text-muted'}`}>
          {tags.length}/{max} tags
        </span>
      </div>
    </div>
  );
}
