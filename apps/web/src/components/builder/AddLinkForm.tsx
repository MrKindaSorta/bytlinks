import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLinks } from '../../hooks/useLinks';

export function AddLinkForm() {
  const { createLink } = useLinks();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await createLink({ title, url });
      setTitle('');
      setUrl('');
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                   border border-dashed border-brand-border bg-brand-surface
                   font-body text-sm font-medium text-brand-text-secondary
                   transition-colors duration-fast hover:border-brand-accent hover:text-brand-accent"
      >
        <Plus className="w-4 h-4" />
        Add link
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-brand-border bg-brand-surface p-4 space-y-3"
    >
      {error && (
        <p className="font-body text-xs text-red-600">{error}</p>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full font-body text-sm px-3 py-2 rounded-lg border border-brand-border
                   bg-brand-bg text-brand-text placeholder:text-brand-text-muted
                   transition-colors duration-fast
                   focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
        placeholder="Link title"
        autoFocus
      />

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        className="w-full font-body text-sm px-3 py-2 rounded-lg border border-brand-border
                   bg-brand-bg text-brand-text placeholder:text-brand-text-muted
                   transition-colors duration-fast
                   focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
        placeholder="https://"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="font-body text-sm font-semibold px-4 py-2 rounded-lg
                     bg-brand-accent text-white
                     transition-colors duration-fast hover:bg-brand-accent-hover
                     disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setError(null); }}
          className="font-body text-sm font-medium px-4 py-2 rounded-lg
                     text-brand-text-secondary
                     transition-colors duration-fast hover:text-brand-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
