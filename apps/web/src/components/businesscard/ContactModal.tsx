import { useState, useRef, useEffect } from 'react';
import {
  X, RefreshCw, Trash2, ExternalLink,
  Mail, Phone, Building2, MapPin, Briefcase, StickyNote,
} from 'lucide-react';
import type { RolodexEntry } from '@bytlinks/shared';

interface ContactModalProps {
  entry: RolodexEntry;
  onClose: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  onNotesChange: (notes: string) => void;
}

export function ContactModal({ entry, onClose, onRemove, onRefresh, onNotesChange }: ContactModalProps) {
  const snap = entry.contact_snapshot;
  const avatarUrl = snap.avatar_r2_key ? `/api/public/avatar/${snap.avatar_r2_key}` : null;
  const [notes, setNotes] = useState(entry.notes || '');
  const [showNotes, setShowNotes] = useState(!!entry.notes);
  const [refreshing, setRefreshing] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onNotesChange(value), 600);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  }

  const lastUpdated = entry.last_refreshed_at
    ? formatRelativeTime(entry.last_refreshed_at)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-brand-bg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-modal-up">
        {/* Header */}
        <div className="sticky top-0 bg-brand-bg/95 backdrop-blur-sm px-5 pt-4 pb-3 flex items-center justify-between border-b border-brand-border z-10">
          <h3 className="font-body text-sm font-semibold text-brand-text">Contact Details</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-brand-surface-alt transition-colors"
              title="Refresh card data"
            >
              <RefreshCw className={`w-4 h-4 text-brand-text-muted ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-surface-alt transition-colors">
              <X className="w-4 h-4 text-brand-text-muted" />
            </button>
          </div>
        </div>

        {/* Card Display */}
        <div className="p-5">
          <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shadow-xl overflow-hidden">
            <div className="px-5 pt-6 pb-4">
              <div className="flex items-start gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-white/60">
                      {(snap.display_name || entry.contact_username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-lg font-800 text-white tracking-tight truncate">
                    {snap.display_name || entry.contact_username}
                  </h2>
                  {snap.job_title && (
                    <p className="text-sm text-white/60 mt-0.5 truncate flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />{snap.job_title}
                    </p>
                  )}
                  {snap.company_name && (
                    <p className="text-sm text-white/40 mt-0.5 truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />{snap.company_name}
                    </p>
                  )}
                </div>
              </div>
              {snap.bio && (
                <p className="text-sm text-white/50 mt-3 line-clamp-3">{snap.bio}</p>
              )}
            </div>

            <div className="mx-5 border-t border-white/10" />

            <div className="px-5 py-4 space-y-2.5">
              {snap.email && (
                <a href={`mailto:${snap.email}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <Mail className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/70 truncate">{snap.email}</span>
                </a>
              )}
              {snap.phone && (
                <a href={`tel:${snap.phone}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <Phone className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/70 truncate">{snap.phone}</span>
                </a>
              )}
              {snap.address && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/70 truncate">{snap.address}</span>
                </div>
              )}
              {!snap.email && !snap.phone && !snap.address && (
                <p className="text-sm text-white/30 italic">No contact info shared.</p>
              )}
            </div>

            <a
              href={`https://www.bytlinks.com/${entry.contact_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-5 py-3 bg-white/5 border-t border-white/10 hover:bg-white/10 transition-colors group"
            >
              <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-white/50 transition-colors shrink-0" />
              <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors tracking-wide">
                bytlinks.com/{entry.contact_username}
              </span>
            </a>
          </div>

          {/* Notes */}
          <div className="mt-4">
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-1.5 font-body text-xs font-medium text-brand-text-muted hover:text-brand-text-secondary transition-colors"
              >
                <StickyNote className="w-3.5 h-3.5" /> Add a note
              </button>
            ) : (
              <div>
                <label className="font-body text-xs font-medium text-brand-text-secondary mb-1 block">
                  Private Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Add a personal note about this contact..."
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface font-body text-sm text-brand-text placeholder:text-brand-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                />
                <p className="text-right text-[10px] text-brand-text-muted mt-0.5">{notes.length}/500</p>
              </div>
            )}
          </div>

          {/* Footer info + actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              {lastUpdated && (
                <p className="font-body text-[10px] text-brand-text-muted">Updated {lastUpdated}</p>
              )}
              <p className="font-body text-[10px] text-brand-text-muted">
                Saved {formatRelativeTime(entry.saved_at)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={`/${entry.contact_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-brand-border hover:bg-brand-surface-alt transition-colors"
                title="View full profile"
              >
                <ExternalLink className="w-4 h-4 text-brand-text-muted" />
              </a>
              <button
                onClick={onRemove}
                className="p-2 rounded-lg border border-brand-border hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-brand-text-muted"
                title="Remove from Rolodex"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Format an ISO date string as a relative time (e.g. "2h ago", "3d ago") */
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
