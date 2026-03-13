import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import type { ContentBlock, FormData } from '@bytlinks/shared';

interface Submission {
  id: string;
  data: Record<string, unknown>;
  created_at: number;
}

interface ManageFormsProps {
  blocks: ContentBlock[];
}

const PAGE_SIZE = 25;

function formatDate(val: number): string {
  return new Date(val * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function FormCard({ block }: { block: ContentBlock }) {
  const formData = block.data as FormData;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forms/${block.id}/submissions?page=${page}&limit=${PAGE_SIZE}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: Submission[]; total?: number; total_pages?: number }) => {
        if (json.success) {
          setSubmissions(json.data ?? []);
          setTotal(json.total ?? 0);
          setTotalPages(json.total_pages ?? 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [block.id, page]);

  async function handleExport(format: 'csv' | 'json') {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/forms/${block.id}/submissions/export?format=${format}`, { credentials: 'include' });
      if (!res.ok) { setExporting(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-${block.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally { setExporting(false); }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/forms/${block.id}/submissions/${id}`, { method: 'DELETE', credentials: 'include' });
      setSubmissions((s) => s.filter((sub) => sub.id !== id));
      setTotal((t) => t - 1);
    } catch { /* silent */ }
  }

  const fieldLabels = formData.fields?.map((f) => ({ id: f.id, label: f.label || f.type })) || [];
  const displayFields = fieldLabels.slice(0, 4);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-display text-sm font-bold text-brand-text flex-1 min-w-0">
          {formData.title || block.title || 'Untitled Form'}
        </h3>
        <span className="font-body text-xs text-brand-text-muted shrink-0">{total} submissions</span>
      </div>

      <div className="flex items-center justify-between mb-3 mt-3">
        <h4 className="font-body text-xs font-semibold text-brand-text-muted uppercase tracking-wide">
          Submissions
        </h4>
        {total > 0 && (
          <div className="flex gap-1.5">
            <button onClick={() => handleExport('csv')} disabled={exporting}
              className="inline-flex items-center gap-1.5 font-body text-xs font-medium px-2.5 py-1 rounded-lg bg-brand-surface-alt border border-brand-border text-brand-text-secondary hover:text-brand-text disabled:opacity-50 transition-colors duration-fast">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={() => handleExport('json')} disabled={exporting}
              className="inline-flex items-center gap-1.5 font-body text-xs font-medium px-2.5 py-1 rounded-lg bg-brand-surface-alt border border-brand-border text-brand-text-secondary hover:text-brand-text disabled:opacity-50 transition-colors duration-fast">
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-brand-text-muted font-body text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : submissions.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted">No submissions yet.</p>
      ) : (
        <>
          <div className="rounded-xl border border-brand-border overflow-hidden overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="bg-brand-surface-alt border-b border-brand-border">
                  {displayFields.map((f) => (
                    <th key={f.id} className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">{f.label}</th>
                  ))}
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-brand-text-muted">Date</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-brand-border last:border-0 hover:bg-brand-surface-alt transition-colors duration-fast">
                    {displayFields.map((f) => (
                      <td key={f.id} className="px-4 py-2.5 text-brand-text max-w-[200px] truncate">
                        {String(sub.data[f.id] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-brand-text-muted text-xs">{formatDate(sub.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete(sub.id)} className="p-1 text-red-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="font-body text-xs text-brand-text-muted">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded text-brand-text-secondary hover:text-brand-text disabled:opacity-30 transition-colors duration-fast"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-body text-xs text-brand-text-muted px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded text-brand-text-secondary hover:text-brand-text disabled:opacity-30 transition-colors duration-fast"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ManageForms({ blocks }: ManageFormsProps) {
  const formBlocks = blocks.filter((b) => b.block_type === 'form');

  if (formBlocks.length === 0) {
    return (
      <div className="max-w-xl">
        <p className="font-body text-sm text-brand-text-muted">Add a Form block to manage it here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {formBlocks.map((block) => (
        <FormCard key={block.id} block={block} />
      ))}
    </div>
  );
}
