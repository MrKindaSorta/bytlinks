import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { CollabsData } from '@bytlinks/shared';

export function CollabsEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as CollabsData;
  const [usernames, setUsernames] = useState<string[]>(data.usernames || []);
  const [draft, setDraft] = useState('');

  function save(newUsernames: string[]) {
    setUsernames(newUsernames);
    editBlock(block.id, { data: { usernames: newUsernames } });
  }

  function addUsername() {
    const trimmed = draft.trim().replace(/^@/, '');
    if (!trimmed || usernames.includes(trimmed)) return;
    save([...usernames, trimmed]);
    setDraft('');
  }

  function removeUsername(index: number) {
    save(usernames.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
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
      <div className="flex flex-wrap gap-1.5">
        {usernames.map((u, i) => (
          <span key={u} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-surface-alt font-body text-xs text-brand-text">
            @{u}
            <button onClick={() => removeUsername(i)} className="text-brand-text-muted hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
