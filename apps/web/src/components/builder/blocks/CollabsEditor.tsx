import { useState } from 'react';
import { Plus, X, LayoutGrid, List } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { CollabsData, CollabItem } from '@bytlinks/shared';

/** Normalise legacy `usernames` to `items` format on first load */
function normaliseItems(data: CollabsData): CollabItem[] {
  if (data.items && data.items.length > 0) return data.items;
  if (data.usernames && data.usernames.length > 0) {
    return data.usernames.map((u) => ({ username: u }));
  }
  return [];
}

export function CollabsEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as CollabsData;
  const [items, setItems] = useState<CollabItem[]>(normaliseItems(data));
  const [displayStyle, setDisplayStyle] = useState<'grid' | 'list'>(data.display_style || 'grid');
  const [draft, setDraft] = useState('');

  function save(newItems: CollabItem[], style?: 'grid' | 'list') {
    setItems(newItems);
    editBlock(block.id, {
      data: {
        items: newItems,
        // Keep backward-compat usernames field
        usernames: newItems.map((i) => i.username),
        display_style: style ?? displayStyle,
      },
    });
  }

  function addUsername() {
    const trimmed = draft.trim().replace(/^@/, '');
    if (!trimmed || items.some((i) => i.username === trimmed)) return;
    const newItems = [...items, { username: trimmed }];
    save(newItems);
    setDraft('');
  }

  function removeItem(index: number) {
    save(items.filter((_, i) => i !== index));
  }

  function updateRelationshipLabel(index: number, label: string) {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, relationship_label: label || undefined } : item
    );
    setItems(newItems);
    save(newItems);
  }

  function handleStyleChange(style: 'grid' | 'list') {
    setDisplayStyle(style);
    editBlock(block.id, {
      data: {
        items,
        usernames: items.map((i) => i.username),
        display_style: style,
      },
    });
  }

  return (
    <div className="space-y-3">
      {/* Display style picker */}
      <div>
        <label className="font-body text-xs font-medium text-brand-text-secondary mb-1.5 block">Display Style</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleStyleChange('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-body text-xs font-medium transition-colors duration-150 ${
              displayStyle === 'grid'
                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                : 'border-brand-border text-brand-text-muted hover:border-brand-accent/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => handleStyleChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-body text-xs font-medium transition-colors duration-150 ${
              displayStyle === 'list'
                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                : 'border-brand-border text-brand-text-muted hover:border-brand-accent/50'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Add username */}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUsername(); } }}
          placeholder="@username"
          className="flex-1 px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
        />
        <button
          onClick={addUsername}
          disabled={!draft.trim()}
          className="px-2.5 py-1.5 rounded-md bg-brand-accent text-white font-body text-xs font-medium disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.username} className="rounded-lg border border-brand-border bg-brand-surface-alt overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="font-body text-sm font-medium text-brand-text flex-1 truncate">
                @{item.username}
              </span>
              <button onClick={() => removeItem(i)} className="text-brand-text-muted hover:text-red-500 transition-colors duration-150 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-3 pb-2">
              <input
                type="text"
                value={item.relationship_label || ''}
                onChange={(e) => updateRelationshipLabel(i, e.target.value)}
                placeholder="Relationship label (e.g. 'Collaborator', 'Manager')"
                maxLength={40}
                className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="font-body text-xs text-brand-text-muted text-center py-2">
          Add usernames to show your collaborators
        </p>
      )}
    </div>
  );
}
