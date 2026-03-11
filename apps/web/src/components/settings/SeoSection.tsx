import { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { usePage } from '../../hooks/usePage';
import { TagInput } from './TagInput';

/** Google result preview colors — these are the only non-brand hardcoded values in this component. */
const GOOGLE_GREEN = '#006621';
const GOOGLE_BLUE = '#1a0dab';

interface SeoData {
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
}

function charCountColor(current: number, max: number): string {
  if (current > max) return 'text-red-500';
  if (current >= max * 0.8) return 'text-brand-accent';
  return 'text-brand-text-muted';
}

export function SeoSection() {
  const { page } = usePage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/seo/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const d = json.data as SeoData;
          setTitle(d.seo_title || '');
          setDescription(d.seo_description || '');
          setTags(d.seo_keywords ? d.seo_keywords.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/seo/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          seo_title: title || null,
          seo_description: description || null,
          seo_keywords: tags.length > 0 ? tags.join(', ') : null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to save.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  // Resolved preview values
  const previewTitle = title || page?.display_name || page?.username || 'Your page';
  const previewDesc = description
    || page?.bio
    || 'Find all my links, content, and contact info on BytLinks.';
  const previewUrl = page?.username ? `bytlinks.com/${page.username}` : 'bytlinks.com/yourname';

  if (loading) {
    return (
      <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-5 h-5 text-brand-accent" />
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
          Search &amp; Discovery
        </h2>
      </div>
      <p className="font-body text-sm text-brand-text-secondary mb-6">
        Control how your page appears in Google and when shared on social media.
      </p>

      <div className="space-y-5">
        {/* Page Title */}
        <div>
          <label className="block font-body text-sm font-medium text-brand-text mb-1.5">
            Page title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={70}
            placeholder="e.g. Marcus Webb — Brand Director"
            className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text placeholder:text-brand-text-muted
                       transition-colors duration-fast
                       focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-transparent"
          />
          <div className="flex justify-between mt-1">
            <span className="font-body text-xs text-brand-text-muted">
              Defaults to your display name if left empty.
            </span>
            <span className={`font-body text-xs ${charCountColor(title.length, 60)}`}>
              {title.length}/60
            </span>
          </div>
        </div>

        {/* Meta Description */}
        <div>
          <label className="block font-body text-sm font-medium text-brand-text mb-1.5">
            Search description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="A short description of who you are and what people will find on your page."
            className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                       bg-brand-bg text-brand-text placeholder:text-brand-text-muted resize-none
                       transition-colors duration-fast
                       focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-transparent"
          />
          <div className="flex justify-between mt-1">
            <span className="font-body text-xs text-brand-text-muted">
              Appears beneath your page title in Google search results.
            </span>
            <span className={`font-body text-xs ${charCountColor(description.length, 160)}`}>
              {description.length}/160
            </span>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block font-body text-sm font-medium text-brand-text mb-1.5">
            Keywords
          </label>
          <TagInput tags={tags} onChange={setTags} max={10} />
          <p className="font-body text-xs text-brand-text-muted mt-1">
            Words that describe you — your name, role, skills, topics you cover.
          </p>
        </div>

        {/* Google Preview */}
        <div>
          <span className="block font-body text-xs font-semibold uppercase tracking-wider text-brand-text-muted mb-2">
            Preview
          </span>
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <div className="font-body text-sm" style={{ color: GOOGLE_GREEN }}>
              {previewUrl}
            </div>
            <div
              className="font-body text-lg font-medium mt-0.5 truncate"
              style={{ color: GOOGLE_BLUE }}
            >
              {previewTitle.length > 60 ? previewTitle.slice(0, 57) + '...' : previewTitle}
              {!title && ' | BytLinks'}
            </div>
            <div className="font-body text-sm text-brand-text-secondary mt-0.5 line-clamp-2">
              {previewDesc.length > 160 ? previewDesc.slice(0, 157) + '...' : previewDesc}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg
                     bg-brand-accent text-white
                     transition-colors duration-fast hover:bg-brand-accent-hover
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : saved ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          ) : 'Save SEO settings'}
        </button>
      </div>
    </section>
  );
}
