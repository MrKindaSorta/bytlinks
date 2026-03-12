import { useState } from 'react';
import { Download } from 'lucide-react';

export function AdminExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/bytadmin/export?format=json', { credentials: 'include' });
      const data = await res.json();
      if (!data.success) return;

      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];

      const a = document.createElement('a');
      a.href = url;
      a.download = `bytlinks-admin-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border font-body text-xs font-medium text-brand-text-muted hover:bg-brand-surface-alt disabled:opacity-50"
    >
      <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
      Export
    </button>
  );
}
