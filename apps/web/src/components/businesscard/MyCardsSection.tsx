import { useRef, useEffect, useCallback, useState } from 'react';
import {
  UserRoundPlus, Mail, Phone, Building2, MapPin, Share2,
  Plus, Trash2, ChevronLeft, ChevronRight, User as UserIcon, Briefcase, FileText,
  Users, Radio, Settings2, X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePage } from '../../hooks/usePage';
import { useAuth } from '../../hooks/useAuth';
import type { BusinessCard, BioPage, User } from '@bytlinks/shared';

type CardField = 'show_avatar' | 'show_job_title' | 'show_bio' | 'show_email'
  | 'show_phone' | 'show_company' | 'show_address' | 'show_socials';

export function MyCardsSection() {
  const { page } = usePage();
  const { user } = useAuth();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloadToast, setDownloadToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const username = page?.username ?? '';
  const cardPageUrl = `https://www.bytlinks.com/${username}/card`;
  const profileUrl = `https://www.bytlinks.com/${username}`;
  const vcardUrl = `/api/public/${username}/vcard`;
  const displayName = page?.display_name || username;

  const avatarUrl = page?.avatar_r2_key
    ? `/api/public/avatar/${page.avatar_r2_key}`
    : null;

  useEffect(() => {
    if (!page) return;
    fetch('/api/pages/me/cards', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.cards) setCards(json.data.cards);
        else setError('Failed to load cards');
      })
      .catch(() => setError('Failed to load cards'))
      .finally(() => setLoading(false));
  }, [page]);

  const activeCard = cards[activeIndex] ?? null;
  const qrUrl = activeCard?.qr_target === 'profile' ? profileUrl : cardPageUrl;

  const renderQr = useCallback(async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !username) return;
    try {
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrUrl, username, loading]);

  useEffect(() => { renderQr(); }, [renderQr]);

  async function updateCard(cardId: string, updates: Partial<BusinessCard>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/me/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error || 'Failed to save');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Network error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function toggleField(field: CardField) {
    if (!activeCard) return;
    const newVal = !activeCard[field];
    setCards((prev) => prev.map((c) => c.id === activeCard.id ? { ...c, [field]: newVal } : c));
    updateCard(activeCard.id, { [field]: newVal });
  }

  function handleLabelChange(label: string) {
    if (!activeCard) return;
    setCards((prev) => prev.map((c) => c.id === activeCard.id ? { ...c, label } : c));
  }

  function handleLabelBlur() {
    if (!activeCard) return;
    updateCard(activeCard.id, { label: activeCard.label });
  }

  function toggleQrTarget() {
    if (!activeCard) return;
    const newTarget = activeCard.qr_target === 'card' ? 'profile' : 'card';
    setCards((prev) => prev.map((c) => c.id === activeCard.id ? { ...c, qr_target: newTarget } : c));
    updateCard(activeCard.id, { qr_target: newTarget } as Partial<BusinessCard>);
  }

  async function addCard() {
    setError(null);
    try {
      const res = await fetch('/api/pages/me/cards', { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data?.card) {
        setCards((prev) => [...prev, json.data.card]);
        setActiveIndex(cards.length);
      } else {
        setError(json.error || 'Failed to add card');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Failed to add card');
      setTimeout(() => setError(null), 3000);
    }
  }

  async function deleteCard() {
    if (!activeCard || cards.length <= 1) return;
    if (!window.confirm(`Delete "${activeCard.label}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/pages/me/cards/${activeCard.id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== activeCard.id));
        setActiveIndex((i) => Math.max(0, i - 1));
      } else {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error || 'Failed to delete');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Failed to delete');
      setTimeout(() => setError(null), 3000);
    }
  }

  async function handleAddToContacts() {
    if (navigator.canShare) {
      try {
        const testFile = new File([''], 'test.vcf', { type: 'text/vcard' });
        if (navigator.canShare({ files: [testFile] })) {
          const res = await fetch(vcardUrl);
          const text = await res.text();
          const file = new File([text], `${username}.vcf`, { type: 'text/vcard' });
          await navigator.share({ files: [file] });
          return;
        }
      } catch { /* fall through */ }
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(vcardUrl + '?inline', '_self');
    } else {
      window.location.href = vcardUrl;
      setDownloadToast(true);
      setTimeout(() => setDownloadToast(false), 4000);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} - Contact Card`, url: cardPageUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(cardPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(cards.length - 1, index)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goTo(activeIndex + 1);
    else goTo(activeIndex - 1);
  }

  if (!page) return null;

  const contactItems: { icon: typeof Mail; label: string; value: string }[] = [];
  if (activeCard?.show_email && user?.email) contactItems.push({ icon: Mail, label: 'Email', value: user.email });
  if (activeCard?.show_phone && page.phone) contactItems.push({ icon: Phone, label: 'Phone', value: page.phone });
  if (activeCard?.show_company && page.company_name) contactItems.push({ icon: Building2, label: 'Company', value: page.company_name });
  if (activeCard?.show_address && page.address) contactItems.push({ icon: MapPin, label: 'Address', value: page.address });

  return (
    <div className="flex flex-col h-full">
      {/* Mobile: no scroll, card fills space. Desktop: scrollable with padding */}
      <div className="flex-1 min-h-0 overflow-hidden lg:overflow-y-auto">
        <div className="flex flex-col h-full lg:h-auto lg:max-w-xl lg:mx-auto lg:px-10 lg:py-8">

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Card Preview — hero element */}
              <div className="flex-1 min-h-0 flex flex-col justify-center px-4 py-3 lg:px-0 lg:py-0 lg:flex-none">
                <div
                  className="relative rounded-2xl border border-brand-border bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shadow-xl overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Top section */}
                  <div className="px-5 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-6">
                    <div className="flex items-start gap-4">
                      {activeCard?.show_avatar !== false && (
                        <div className="shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl object-cover ring-2 ring-white/10" />
                          ) : (
                            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white/10 flex items-center justify-center">
                              <span className="text-xl lg:text-2xl font-bold text-white/60">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-1">
                        <h2 className="text-lg lg:text-xl font-800 text-white tracking-tight leading-tight truncate">{displayName}</h2>
                        {activeCard?.show_job_title !== false && page.job_title && (
                          <p className="text-sm text-white/60 mt-0.5 truncate">{page.job_title}</p>
                        )}
                        {activeCard?.show_company && page.company_name && (
                          <p className="text-sm font-medium text-white/40 mt-0.5 truncate">{page.company_name}</p>
                        )}
                      </div>
                    </div>
                    {activeCard?.show_bio && page.bio && (
                      <p className="text-sm text-white/50 mt-2 line-clamp-2">{page.bio}</p>
                    )}
                  </div>

                  <div className="mx-5 lg:mx-6 border-t border-white/10" />

                  {/* Contact + QR */}
                  <div className="px-5 py-4 lg:px-6 lg:py-5 flex gap-4">
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {contactItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="flex items-start gap-2.5">
                            <Icon className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">{item.label}</p>
                              <p className="text-sm text-white/80 truncate">{item.value}</p>
                            </div>
                          </div>
                        );
                      })}
                      {contactItems.length === 0 && (
                        <p className="text-sm text-white/30 italic">No contact info visible.</p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="rounded-lg bg-white p-1.5">
                        <canvas ref={qrCanvasRef} width={120} height={120} className="block w-[100px] h-[100px] lg:w-[120px] lg:h-[120px]" />
                      </div>
                      <p className="text-[10px] text-white/30 mt-1 text-center">Scan to view</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-2.5 bg-white/5 border-t border-white/10">
                    <p className="text-[11px] text-white/25 text-center tracking-wide">
                      {activeCard?.label || 'My Card'} — bytlinks.com/{username}/card
                    </p>
                  </div>

                  {/* Nav arrows (desktop) */}
                  {cards.length > 1 && (
                    <>
                      {activeIndex > 0 && (
                        <button onClick={() => goTo(activeIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white/80 transition-colors" aria-label="Previous card">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      {activeIndex < cards.length - 1 && (
                        <button onClick={() => goTo(activeIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white/80 transition-colors" aria-label="Next card">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Dots */}
                {cards.length > 1 && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    {cards.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => goTo(i)}
                        className="rounded-full transition-all duration-200"
                        style={{
                          width: i === activeIndex ? 24 : 8,
                          height: 8,
                          background: i === activeIndex ? 'var(--brand-accent, #0d9488)' : 'var(--brand-border, #d4d4d4)',
                        }}
                        aria-label={`Card ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Action bar — always visible at bottom on mobile */}
              <div className="shrink-0 px-4 pb-3 lg:px-0 lg:pb-0 lg:mt-4">
                <div className="grid grid-cols-3 gap-2 lg:gap-3">
                  <button
                    onClick={handleAddToContacts}
                    className="flex items-center justify-center gap-1.5 font-body text-xs lg:text-sm font-semibold px-3 py-2.5 lg:py-3 rounded-xl bg-brand-accent text-white transition-colors duration-fast hover:bg-brand-accent-hover"
                  >
                    <UserRoundPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 font-body text-xs lg:text-sm font-semibold px-3 py-2.5 lg:py-3 rounded-xl border border-brand-border bg-brand-surface text-brand-text transition-colors duration-fast hover:bg-brand-surface-alt"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center justify-center gap-1.5 font-body text-xs lg:text-sm font-semibold px-3 py-2.5 lg:py-3 rounded-xl border border-brand-border bg-brand-surface text-brand-text transition-colors duration-fast hover:bg-brand-surface-alt lg:hidden"
                  >
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                </div>

                {downloadToast && (
                  <p className="mt-2 text-center text-xs text-brand-text-secondary">
                    Contact downloaded — tap the notification to add.
                  </p>
                )}
                {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
              </div>

              {/* Desktop: inline settings panel */}
              {activeCard && (
                <div className="hidden lg:block px-0 mt-6 lg:pb-10">
                  <CardSettings
                    card={activeCard}
                    cards={cards}
                    page={page}
                    user={user}
                    saving={saving}
                    error={error}
                    onToggleField={toggleField}
                    onLabelChange={handleLabelChange}
                    onLabelBlur={handleLabelBlur}
                    onToggleQrTarget={toggleQrTarget}
                    onAddCard={addCard}
                    onDeleteCard={deleteCard}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile: bottom sheet settings */}
      {showSettings && activeCard && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-brand-bg rounded-t-2xl max-h-[75vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-brand-bg px-4 pt-4 pb-2 flex items-center justify-between border-b border-brand-border">
              <h3 className="font-body text-sm font-semibold text-brand-text">Card Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-brand-surface-alt transition-colors">
                <X className="w-4 h-4 text-brand-text-muted" />
              </button>
            </div>
            <div className="p-4">
              <CardSettings
                card={activeCard}
                cards={cards}
                page={page}
                user={user}
                saving={saving}
                error={error}
                onToggleField={toggleField}
                onLabelChange={handleLabelChange}
                onLabelBlur={handleLabelBlur}
                onToggleQrTarget={toggleQrTarget}
                onAddCard={addCard}
                onDeleteCard={deleteCard}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Card Settings Panel ── */
function CardSettings({
  card,
  cards,
  page,
  user,
  saving,
  error,
  onToggleField,
  onLabelChange,
  onLabelBlur,
  onToggleQrTarget,
  onAddCard,
  onDeleteCard,
}: {
  card: BusinessCard;
  cards: BusinessCard[];
  page: BioPage;
  user: User | null;
  saving: boolean;
  error: string | null;
  onToggleField: (field: CardField) => void;
  onLabelChange: (label: string) => void;
  onLabelBlur: () => void;
  onToggleQrTarget: () => void;
  onAddCard: () => void;
  onDeleteCard: () => void;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-body text-sm font-semibold text-brand-text">Card Settings</h3>
        <div className="flex items-center gap-2">
          {cards.length < 3 && (
            <button onClick={onAddCard} className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Card
            </button>
          )}
          {cards.length > 1 && (
            <button onClick={onDeleteCard} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-xs font-medium text-brand-text-secondary">Card Name</label>
          <span className="font-body text-[10px] text-brand-text-muted tabular-nums">{card.label.length}/30</span>
        </div>
        <input
          type="text"
          value={card.label}
          onChange={(e) => onLabelChange(e.target.value)}
          onBlur={onLabelBlur}
          maxLength={30}
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
          placeholder="e.g. Work, Personal, Networking"
        />
      </div>

      {/* Field toggles */}
      <div className="space-y-2.5">
        <p className="font-body text-xs font-medium text-brand-text-secondary">Visible Fields</p>
        <FieldToggle icon={UserIcon} label="Avatar" checked={card.show_avatar} onChange={() => onToggleField('show_avatar')} />
        <FieldToggle icon={Briefcase} label="Job Title" checked={card.show_job_title} onChange={() => onToggleField('show_job_title')} />
        <FieldToggle icon={FileText} label="Bio" checked={card.show_bio} onChange={() => onToggleField('show_bio')} />
        <FieldToggle icon={Mail} label="Email" checked={card.show_email} onChange={() => onToggleField('show_email')} disabled={!user?.email} hint={!user?.email ? 'No email' : undefined} />
        <FieldToggle icon={Phone} label="Phone" checked={card.show_phone} onChange={() => onToggleField('show_phone')} disabled={!page?.phone} hint={!page?.phone ? 'Add in profile' : undefined} />
        <FieldToggle icon={Building2} label="Company" checked={card.show_company} onChange={() => onToggleField('show_company')} disabled={!page?.company_name} hint={!page?.company_name ? 'Add in profile' : undefined} />
        <FieldToggle icon={MapPin} label="Address" checked={card.show_address} onChange={() => onToggleField('show_address')} disabled={!page?.address} hint={!page?.address ? 'Add in profile' : undefined} />
        <FieldToggle icon={Users} label="Social Icons" checked={card.show_socials} onChange={() => onToggleField('show_socials')} />
      </div>

      {/* QR Target */}
      <div className="mt-5 pt-4 border-t border-brand-border">
        <p className="font-body text-xs font-medium text-brand-text-secondary mb-2">QR Code Links To</p>
        <div className="flex gap-2">
          <button
            onClick={() => { if (card.qr_target !== 'card') onToggleQrTarget(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              card.qr_target === 'card' ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-brand-border text-brand-text-secondary hover:bg-brand-surface-alt'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Card Page
          </button>
          <button
            onClick={() => { if (card.qr_target !== 'profile') onToggleQrTarget(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              card.qr_target === 'profile' ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-brand-border text-brand-text-secondary hover:bg-brand-surface-alt'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Full Profile
          </button>
        </div>
      </div>

      {saving && <p className="mt-2 text-[11px] text-brand-text-muted text-right">Saving...</p>}
      {error && <p className="mt-2 text-[11px] text-red-500 text-right">{error}</p>}
    </div>
  );
}

function FieldToggle({ icon: Icon, label, checked, onChange, disabled, hint }: {
  icon: typeof Mail; label: string; checked: boolean; onChange: () => void; disabled?: boolean; hint?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <Icon className="w-4 h-4 text-brand-text-muted shrink-0" />
      <span className="font-body text-sm text-brand-text flex-1">{label}</span>
      {hint && <span className="font-body text-[10px] text-brand-text-muted">{hint}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0 ${checked ? 'bg-brand-accent' : 'bg-brand-border'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-[3px] left-[3px] w-[12px] h-[12px] rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-[14px]' : ''}`} />
      </button>
    </div>
  );
}
