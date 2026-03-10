import type { BlockCategory } from './blockConstants';

const CATEGORIES: { key: BlockCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'interactive', label: 'Interactive' },
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'navigation', label: 'Navigation' },
];

interface Props {
  active: BlockCategory;
  onChange: (cat: BlockCategory) => void;
}

export function BlockFilterBar({ active, onChange }: Props) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="flex gap-2">
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-shrink-0 font-body text-xs font-medium px-3 py-1.5 rounded-full transition-colors duration-150 ${
              active === key
                ? 'bg-brand-accent text-white'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-raised'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
