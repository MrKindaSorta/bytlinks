import { useState, useEffect, useCallback } from 'react';
import {
  Search, CheckCircle, XCircle,
  BookUser, ScanLine,
  Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { RolodexEntry, CardExchange } from '@bytlinks/shared';
import { ContactModal } from './ContactModal';

interface RolodexSectionProps {
  onExchangeUpdate: () => void;
}

export function RolodexSection({ onExchangeUpdate }: RolodexSectionProps) {
  const [entries, setEntries] = useState<RolodexEntry[]>([]);
  const [exchanges, setExchanges] = useState<CardExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<RolodexEntry | null>(null);
  const [autoAccept, setAutoAccept] = useState(false);
  const [showPending, setShowPending] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/rolodex', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/rolodex/exchanges', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/rolodex/auto-accept', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([rolodex, exch, aa]) => {
        if (rolodex.success) setEntries(rolodex.data.entries);
        if (exch.success) setExchanges(exch.data.exchanges);
        if (aa.success) setAutoAccept(aa.data.enabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleAutoAccept() {
    const newVal = !autoAccept;
    setAutoAccept(newVal);
    await fetch('/api/rolodex/auto-accept', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled: newVal }),
    }).catch(() => setAutoAccept(!newVal));
  }

  async function handleExchange(exchangeId: string, action: 'accept' | 'decline') {
    try {
      const res = await fetch(`/api/rolodex/exchanges/${exchangeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setExchanges((prev) => prev.filter((e) => e.id !== exchangeId));
        onExchangeUpdate();
        if (action === 'accept') fetchData(); // refresh entries
      }
    } catch { /* silent */ }
  }

  async function removeEntry(entryId: string) {
    if (!window.confirm('Remove this contact from your Rolodex?')) return;
    try {
      await fetch(`/api/rolodex/${entryId}`, { method: 'DELETE', credentials: 'include' });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setSelectedEntry(null);
    } catch { /* silent */ }
  }

  async function refreshEntry(entryId: string) {
    try {
      const res = await fetch(`/api/rolodex/${entryId}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, contact_snapshot: json.data.contact_snapshot, last_refreshed_at: new Date().toISOString() }
              : e
          )
        );
        if (selectedEntry?.id === entryId) {
          setSelectedEntry((prev) =>
            prev ? { ...prev, contact_snapshot: json.data.contact_snapshot, last_refreshed_at: new Date().toISOString() } : null
          );
        }
      }
    } catch { /* silent */ }
  }

  async function updateNotes(entryId: string, notes: string) {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, notes } : e));
    await fetch(`/api/rolodex/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes }),
    }).catch(() => {});
  }

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const s = e.contact_snapshot;
    return (
      s.display_name?.toLowerCase().includes(q) ||
      s.company_name?.toLowerCase().includes(q) ||
      e.contact_username.toLowerCase().includes(q) ||
      s.job_title?.toLowerCase().includes(q)
    );
  });

  function daysUntilExpiry(expiresAt: string): number {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + auto-accept bar */}
      <div className="shrink-0 px-4 py-3 border-b border-brand-border bg-brand-surface space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
          </div>
          {/* Auto-accept toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-body text-[10px] text-brand-text-muted hidden sm:inline whitespace-nowrap">Auto-accept</span>
            <button
              role="switch"
              aria-checked={autoAccept}
              onClick={toggleAutoAccept}
              className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0 ${autoAccept ? 'bg-brand-accent' : 'bg-brand-border'}`}
            >
              <span className={`absolute top-[3px] left-[3px] w-[12px] h-[12px] rounded-full bg-white transition-transform duration-200 ${autoAccept ? 'translate-x-[14px]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Pending Exchanges */}
        {exchanges.length > 0 && (
          <div className="border-b border-brand-border">
            <button
              onClick={() => setShowPending(!showPending)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-surface-alt/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="font-body text-sm font-semibold text-brand-text">
                  Pending Cards
                </span>
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5">
                  {exchanges.length}
                </span>
              </div>
              {showPending ? <ChevronUp className="w-4 h-4 text-brand-text-muted" /> : <ChevronDown className="w-4 h-4 text-brand-text-muted" />}
            </button>

            {showPending && (
              <div className="px-4 pb-3 space-y-2">
                <p className="font-body text-[11px] text-brand-text-muted">
                  {autoAccept
                    ? 'Auto-accept is on — future cards will be added automatically.'
                    : 'These cards expire if not accepted. Enable auto-accept to skip this step.'}
                </p>
                {exchanges.map((ex) => (
                  <PendingExchangeCard
                    key={ex.id}
                    exchange={ex}
                    daysLeft={daysUntilExpiry(ex.expires_at)}
                    onAccept={() => handleExchange(ex.id, 'accept')}
                    onDecline={() => handleExchange(ex.id, 'decline')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-surface-alt flex items-center justify-center">
              <BookUser className="w-8 h-8 text-brand-text-muted" />
            </div>
            <div className="text-center">
              <p className="font-body text-sm font-semibold text-brand-text mb-0.5">
                {search ? 'No matches' : 'Your Rolodex is empty'}
              </p>
              <p className="font-body text-xs text-brand-text-muted max-w-xs">
                {search
                  ? 'Try a different search term.'
                  : 'Scan someone\'s BytLinks card to add them here.'}
              </p>
            </div>
            {!search && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-brand-accent">
                <ScanLine className="w-4 h-4" />
                Go to the Scan tab to get started
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: list | Desktop: grid */}
            <div className="p-4 space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
              {filtered.map((entry) => (
                <ContactListItem
                  key={entry.id}
                  entry={entry}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))}
            </div>
            <div className="px-4 pb-4">
              <p className="font-body text-[10px] text-brand-text-muted text-center">
                {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Contact Modal */}
      {selectedEntry && (
        <ContactModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onRemove={() => removeEntry(selectedEntry.id)}
          onRefresh={() => refreshEntry(selectedEntry.id)}
          onNotesChange={(notes) => updateNotes(selectedEntry.id, notes)}
        />
      )}
    </div>
  );
}

/* ── Pending Exchange Card ── */
function PendingExchangeCard({
  exchange,
  daysLeft,
  onAccept,
  onDecline,
}: {
  exchange: CardExchange;
  daysLeft: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const snap = exchange.card_snapshot;
  const avatarUrl = snap.avatar_r2_key ? `/api/public/avatar/${snap.avatar_r2_key}` : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-amber-600">{(snap.display_name || exchange.from_username).charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-brand-text truncate">
          {snap.display_name || exchange.from_username}
        </p>
        <p className="font-body text-[11px] text-brand-text-muted truncate">
          {snap.job_title || `@${exchange.from_username}`}
          {snap.company_name ? ` · ${snap.company_name}` : ''}
        </p>
        <p className="font-body text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
          {daysLeft}d left to accept
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onAccept}
          className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          aria-label="Accept"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
        <button
          onClick={onDecline}
          className="p-2 rounded-lg bg-brand-surface border border-brand-border text-brand-text-muted hover:text-red-500 hover:border-red-300 transition-colors"
          aria-label="Decline"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Contact List Item ── */
function ContactListItem({
  entry,
  onClick,
}: {
  entry: RolodexEntry;
  onClick: () => void;
}) {
  const snap = entry.contact_snapshot;
  const avatarUrl = snap.avatar_r2_key ? `/api/public/avatar/${snap.avatar_r2_key}` : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-surface-alt transition-all duration-200 active:scale-[0.98] text-left"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-brand-accent">
            {(snap.display_name || entry.contact_username).charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-brand-text truncate">
          {snap.display_name || entry.contact_username}
        </p>
        <p className="font-body text-[11px] text-brand-text-muted truncate">
          {snap.job_title && snap.company_name
            ? `${snap.job_title} · ${snap.company_name}`
            : snap.job_title || snap.company_name || `@${entry.contact_username}`}
        </p>
      </div>
      <div className="shrink-0 text-brand-text-muted">
        <ChevronDown className="w-4 h-4 -rotate-90" />
      </div>
    </button>
  );
}
