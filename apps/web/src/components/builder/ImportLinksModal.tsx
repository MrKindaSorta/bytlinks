import { useState, useRef } from 'react';
import { X, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ParsedLink {
  title: string;
  url: string;
  blocked?: boolean;
  blocked_reason?: string;
}

interface ImportLinksModalProps {
  onClose: () => void;
  onImported: () => void;
}

type Step = 'input' | 'preview' | 'importing' | 'success';

export function ImportLinksModal({ onClose, onImported }: ImportLinksModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState<ParsedLink[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleParseUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source: 'url', url: url.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to parse URL');
        return;
      }
      const parsed: ParsedLink[] = json.data.links;
      setLinks(parsed);
      setSelected(new Set(parsed.map((_: ParsedLink, i: number) => i).filter((i: number) => !parsed[i].blocked)));
      setStep('preview');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleParseCsv(file: File) {
    setLoading(true);
    setError(null);
    try {
      const csv = await file.text();
      const res = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source: 'csv', csv }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to parse CSV');
        return;
      }
      const parsed: ParsedLink[] = json.data.links;
      setLinks(parsed);
      setSelected(new Set(parsed.map((_: ParsedLink, i: number) => i).filter((i: number) => !parsed[i].blocked)));
      setStep('preview');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    const toImport = links.filter((_: ParsedLink, i: number) => selected.has(i) && !_.blocked);
    if (toImport.length === 0) return;

    setStep('importing');
    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ links: toImport }),
      });
      const json = await res.json();
      if (json.success) {
        setImportedCount(json.data.created);
        setStep('success');
      } else {
        setError(json.error || 'Import failed');
        setStep('preview');
      }
    } catch {
      setError('Network error. Try again.');
      setStep('preview');
    }
  }

  function toggleLink(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(links.map((_: ParsedLink, i: number) => i).filter((i: number) => !links[i].blocked)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-brand-surface rounded-2xl border border-brand-border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <h3 className="font-display text-base font-700 text-brand-text">Import Links</h3>
          <button onClick={onClose} className="text-brand-text-muted hover:text-brand-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Step: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block font-body text-sm font-medium text-brand-text mb-1.5">
                  Import from URL
                </label>
                <p className="font-body text-xs text-brand-text-muted mb-2">
                  Paste a Linktree, Beacons, or any link-in-bio page URL.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://linktr.ee/username"
                    className="flex-1 font-body text-base md:text-sm px-3 py-2.5 rounded-lg border border-brand-border
                               bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                               focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleParseUrl()}
                  />
                  <button
                    onClick={handleParseUrl}
                    disabled={loading || !url.trim()}
                    className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                               bg-brand-accent text-white transition-colors hover:bg-brand-accent-hover
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-brand-border" />
                <span className="font-body text-xs text-brand-text-muted">or</span>
                <div className="flex-1 h-px bg-brand-border" />
              </div>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-body text-sm font-medium
                           px-4 py-3 rounded-lg border border-brand-border text-brand-text
                           hover:bg-brand-surface-alt transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Upload CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleParseCsv(file);
                }}
              />

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-body text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm font-medium text-brand-text">
                  {links.length} link{links.length !== 1 ? 's' : ''} found
                </p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="font-body text-xs text-brand-accent hover:underline">
                    Select all
                  </button>
                  <button onClick={deselectAll} className="font-body text-xs text-brand-text-muted hover:underline">
                    Deselect all
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {links.map((link, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${link.blocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-surface-alt'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      disabled={link.blocked}
                      onChange={() => toggleLink(i)}
                      className="rounded text-brand-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-brand-text truncate">{link.title}</p>
                      <p className="font-body text-xs text-brand-text-muted truncate">{link.url}</p>
                    </div>
                    {link.blocked && (
                      <span className="font-body text-[10px] text-red-500 flex-shrink-0">Blocked</span>
                    )}
                  </label>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-body text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-brand-accent animate-spin mb-3" />
              <p className="font-body text-sm text-brand-text">Importing links...</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-body text-sm font-medium text-brand-text mb-1">
                {importedCount} link{importedCount !== 1 ? 's' : ''} imported
              </p>
              <p className="font-body text-xs text-brand-text-muted">
                Your links have been added to your page.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-border flex justify-end gap-2">
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('input'); setLinks([]); setError(null); }}
                className="font-body text-sm font-medium px-4 py-2 rounded-lg text-brand-text-muted
                           hover:text-brand-text transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={selected.size === 0}
                className="font-body text-sm font-semibold px-4 py-2 rounded-lg
                           bg-brand-accent text-white hover:bg-brand-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selected.size} link{selected.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'success' && (
            <button
              onClick={() => { onImported(); onClose(); }}
              className="font-body text-sm font-semibold px-4 py-2 rounded-lg
                         bg-brand-accent text-white hover:bg-brand-accent-hover"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
