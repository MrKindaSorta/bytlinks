import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Check, Loader2 } from 'lucide-react';

type ExportFormat = 'json' | 'csv' | 'links-csv' | 'analytics-csv';

interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  directDownload: boolean;
  filename: string;
}

export function ExportSection({ username }: { username?: string }) {
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [done, setDone] = useState<ExportFormat | null>(null);

  const name = username || 'bytlinks';

  const formats: FormatOption[] = [
    {
      id: 'json',
      label: 'Full Profile (JSON)',
      description: 'Everything — profile, links, blocks, theme, analytics, subscribers. Machine-readable, re-importable.',
      icon: <FileJson className="w-5 h-5" />,
      endpoint: '/api/export/json',
      directDownload: false,
      filename: `${name}-export.json`,
    },
    {
      id: 'csv',
      label: 'All Data (CSV bundle)',
      description: 'Links, socials, blocks, analytics, and newsletter subscribers as separate CSV tables in one file.',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      endpoint: '/api/export/csv',
      directDownload: false,
      filename: `${name}-export-all.json`,
    },
    {
      id: 'links-csv',
      label: 'Links Only (CSV)',
      description: 'Just your links with titles, URLs, click counts, and scheduling info. Opens in Excel/Sheets.',
      icon: <FileText className="w-5 h-5" />,
      endpoint: '/api/export/links-csv',
      directDownload: true,
      filename: `${name}-links.csv`,
    },
    {
      id: 'analytics-csv',
      label: 'Analytics (CSV)',
      description: 'Page views, clicks, referrers, countries, devices — up to 10,000 most recent events.',
      icon: <FileText className="w-5 h-5" />,
      endpoint: '/api/export/analytics-csv',
      directDownload: true,
      filename: `${name}-analytics.csv`,
    },
  ];

  async function handleExport(format: FormatOption) {
    setDownloading(format.id);
    setDone(null);

    try {
      const res = await fetch(format.endpoint, { credentials: 'include' });

      if (format.directDownload) {
        // Direct file download (CSV file)
        const blob = await res.blob();
        triggerDownload(blob, format.filename);
      } else {
        // JSON response — download the data payload as a file
        const json = await res.json();
        if (!json.success) return;

        const blob = new Blob(
          [JSON.stringify(json.data, null, 2)],
          { type: 'application/json' },
        );
        triggerDownload(blob, format.filename);
      }

      setDone(format.id);
      setTimeout(() => setDone(null), 3000);
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
      <div className="flex items-center gap-2 mb-2">
        <Download className="w-5 h-5 text-brand-accent" />
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
          Export Your Data
        </h2>
      </div>
      <p className="font-body text-sm text-brand-text-secondary mb-5">
        Download a copy of everything on your BytLinks profile. Your data is yours.
      </p>

      <div className="grid gap-3">
        {formats.map((format) => {
          const isDownloading = downloading === format.id;
          const isDone = done === format.id;

          return (
            <button
              key={format.id}
              onClick={() => handleExport(format)}
              disabled={downloading !== null}
              className="flex items-start gap-3 w-full text-left px-4 py-3.5 rounded-lg
                         border border-brand-border bg-brand-bg
                         hover:border-brand-accent/40 hover:bg-brand-surface-alt
                         transition-all duration-fast
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className={`mt-0.5 flex-shrink-0 ${isDone ? 'text-emerald-500' : 'text-brand-accent'}`}>
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isDone ? (
                  <Check className="w-5 h-5" />
                ) : (
                  format.icon
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-brand-text">
                  {format.label}
                </p>
                <p className="font-body text-xs text-brand-text-muted leading-relaxed mt-0.5">
                  {isDone ? 'Downloaded!' : format.description}
                </p>
              </div>
              <Download className="w-4 h-4 text-brand-text-muted mt-0.5 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
