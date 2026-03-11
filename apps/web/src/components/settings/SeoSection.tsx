import { useState, useEffect } from 'react';
import { Search, Check, ShieldCheck, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePage } from '../../hooks/usePage';
import { TagInput } from './TagInput';

/** Google result preview colors — these are the only non-brand hardcoded values in this component. */
const GOOGLE_GREEN = '#006621';
const GOOGLE_BLUE = '#1a0dab';

/** Amber warning color for incomplete SEO status. */
const SEO_WARN_COLOR = '#b45309';

interface SeoData {
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  updated_at: number | null;
}

function charCountColor(current: number, max: number): string {
  if (current > max) return 'text-red-500';
  if (current >= max * 0.8) return 'text-brand-accent';
  return 'text-brand-text-muted';
}

function relativeTime(unixSeconds: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unixSeconds;

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}

export function SeoSection() {
  const { page } = usePage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
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
          setUpdatedAt(d.updated_at ?? null);
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

  const seoComplete = title.length > 0 && description.length > 0 && tags.length > 0;

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

      {/* Search Visibility status card */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 mb-6">
        <h3 className="text-sm font-medium text-brand-text-secondary uppercase tracking-[0.14em] mb-4">
          Search visibility
        </h3>

        {/* Crawlability */}
        <div className="flex items-start gap-3 py-3 border-b border-brand-border">
          <ShieldCheck className="w-5 h-5 text-brand-accent flex-shrink-0" />
          <div>
            <div className="font-body text-sm font-medium text-brand-text">Your page is crawlable</div>
            <div className="font-body text-xs text-brand-text-muted mt-0.5">
              Search engines can index bytlinks.com/{page?.username}
            </div>
          </div>
        </div>

        {/* Last updated */}
        <div className="flex items-start gap-3 py-3 border-b border-brand-border">
          <Clock className="w-5 h-5 text-brand-text-muted flex-shrink-0" />
          <div>
            <div className="font-body text-sm font-medium text-brand-text">Last updated</div>
            <div className="font-body text-xs text-brand-text-muted mt-0.5">
              {updatedAt ? relativeTime(updatedAt) : 'Unknown'}
            </div>
          </div>
        </div>

        {/* SEO completeness */}
        {seoComplete ? (
          <div className="flex items-start gap-3 py-3">
            <CheckCircle2 className="w-5 h-5 text-brand-accent flex-shrink-0" />
            <div>
              <div className="font-body text-sm font-medium text-brand-text">SEO profile complete</div>
              <div className="font-body text-xs text-brand-text-muted mt-0.5">
                You're controlling your search appearance.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 py-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: SEO_WARN_COLOR }} />
            <div>
              <div className="font-body text-sm font-medium text-brand-text">Improve your search appearance</div>
              <div className="font-body text-xs text-brand-text-muted mt-0.5">
                Add a title and description below to control how you appear in Google.
              </div>
            </div>
          </div>
        )}
      </div>

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
