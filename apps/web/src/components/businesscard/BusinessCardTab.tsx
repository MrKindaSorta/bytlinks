import { useRef, useEffect, useCallback, useState } from 'react';
import {
  UserRoundPlus, Mail, Phone, Building2, MapPin, QrCode, Share2,
  Plus, Trash2, ChevronLeft, ChevronRight, User, Briefcase, FileText,
  Users, Radio,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePage } from '../../hooks/usePage';
import { useAuth } from '../../hooks/useAuth';
import type { BusinessCard } from '@bytlinks/shared';

type CardField = 'show_avatar' | 'show_job_title' | 'show_bio' | 'show_email'
  | 'show_phone' | 'show_company' | 'show_address' | 'show_socials';

export function BusinessCardTab() {
  const { page } = usePage();
  const { user } = useAuth();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloadToast, setDownloadToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch cards
  useEffect(() => {
    if (!page) return;
    fetch('/api/pages/me/cards', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.cards) {
          setCards(json.data.cards);
        } else {
          setError('Failed to load cards');
        }
      })
      .catch(() => setError('Failed to load cards'))
      .finally(() => setLoading(false));
  }, [page]);

  const activeCard = cards[activeIndex] ?? null;

  // Render QR code — respects qr_target setting
  const qrUrl = activeCard?.qr_target === 'profile' ? profileUrl : cardPageUrl;

  const renderQr = useCallback(async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !username) return;
    try {
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch {
      // silent
    }
  }, [qrUrl, username]);

  useEffect(() => {
    renderQr();
  }, [renderQr]);

  // Update card on server
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
      setError('Network error — changes may not be saved');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  // Toggle a boolean field
  function toggleField(field: CardField) {
    if (!activeCard) return;
    const newVal = !activeCard[field];
    setCards((prev) =>
      prev.map((c) => c.id === activeCard.id ? { ...c, [field]: newVal } : c)
    );
    updateCard(activeCard.id, { [field]: newVal });
  }

  // Update card label
  function handleLabelChange(label: string) {
    if (!activeCard) return;
    setCards((prev) =>
      prev.map((c) => c.id === activeCard.id ? { ...c, label } : c)
    );
    // Debounced save handled by onBlur
  }

  function handleLabelBlur() {
    if (!activeCard) return;
    updateCard(activeCard.id, { label: activeCard.label });
  }

  // Toggle QR target
  function toggleQrTarget() {
    if (!activeCard) return;
    const newTarget = activeCard.qr_target === 'card' ? 'profile' : 'card';
    setCards((prev) =>
      prev.map((c) => c.id === activeCard.id ? { ...c, qr_target: newTarget } : c)
    );
    updateCard(activeCard.id, { qr_target: newTarget } as Partial<BusinessCard>);
  }

  // Add card
  async function addCard() {
    setError(null);
    try {
      const res = await fetch('/api/pages/me/cards', {
        method: 'POST',
        credentials: 'include',
      });
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

  // Delete card
  async function deleteCard() {
    if (!activeCard || cards.length <= 1) return;
    if (!window.confirm(`Delete "${activeCard.label}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/pages/me/cards/${activeCard.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== activeCard.id));
        setActiveIndex((i) => Math.max(0, i - 1));
      } else {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error || 'Failed to delete card');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Failed to delete card');
      setTimeout(() => setError(null), 3000);
    }
  }

  // Share
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
      } catch {
        // fall through
      }
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
        await navigator.share({
          title: `${displayName} - Contact Card`,
          url: cardPageUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(cardPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Swipe handlers
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

  // Build contact items for the active card
  const contactItems: { icon: typeof Mail; label: string; value: string }[] = [];
  if (activeCard?.show_email && user?.email) {
    contactItems.push({ icon: Mail, label: 'Email', value: user.email });
  }
  if (activeCard?.show_phone && page.phone) {
    contactItems.push({ icon: Phone, label: 'Phone', value: page.phone });
  }
  if (activeCard?.show_company && page.company_name) {
    contactItems.push({ icon: Building2, label: 'Company', value: page.company_name });
  }
  if (activeCard?.show_address && page.address) {
    contactItems.push({ icon: MapPin, label: 'Address', value: page.address });
  }

  return (
    <div className="px-6 py-8 lg:px-10 lg:py-10 pb-20 lg:pb-10 overflow-y-auto">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5 text-brand-accent" />
          <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text">
            Business Card
          </h1>
        </div>
        <p className="font-body text-sm text-brand-text-secondary mb-6">
          Configure up to 3 cards with different info. Share your card page — visitors swipe between them.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Card Preview */}
            <div
              className="relative rounded-2xl border border-brand-border bg-gradient-to-br from-[#1a1a2e] to-[#16213e]
                          shadow-xl overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Card top section */}
              <div className="px-6 pt-8 pb-6">
                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  {activeCard?.show_avatar !== false && (
                    <div className="shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-20 h-20 rounded-xl object-cover ring-2 ring-white/10"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white/60">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Name + title */}
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="text-xl font-800 text-white tracking-tight leading-tight truncate">
                      {displayName}
                    </h2>
                    {activeCard?.show_job_title !== false && page.job_title && (
                      <p className="text-sm text-white/60 mt-0.5 truncate">{page.job_title}</p>
                    )}
                    {activeCard?.show_company && page.company_name && (
                      <p className="text-sm font-medium text-white/40 mt-0.5 truncate">{page.company_name}</p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {activeCard?.show_bio && page.bio && (
                  <p className="text-sm text-white/50 mt-3 line-clamp-2">{page.bio}</p>
                )}
              </div>

              {/* Divider */}
              <div className="mx-6 border-t border-white/10" />

              {/* Contact details + QR code */}
              <div className="px-6 py-5 flex gap-5">
                <div className="flex-1 min-w-0 space-y-3">
                  {contactItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-start gap-2.5">
                        <Icon className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-white/30 font-medium">{item.label}</p>
                          <p className="text-sm text-white/80 truncate">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                  {contactItems.length === 0 && (
                    <p className="text-sm text-white/30 italic">
                      No contact info visible on this card.
                    </p>
                  )}
                </div>

                {/* QR Code */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="rounded-lg bg-white p-2">
                    <canvas ref={qrCanvasRef} width={140} height={140} className="block" role="img" aria-label="QR code for your business card" />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1.5 text-center">Scan to view</p>
                </div>
              </div>

              {/* Card label footer */}
              <div className="px-6 py-3 bg-white/5 border-t border-white/10">
                <p className="text-[11px] text-white/25 text-center tracking-wide">
                  {activeCard?.label || 'My Card'} — bytlinks.com/{username}/card
                </p>
              </div>

              {/* Desktop swipe arrows */}
              {cards.length > 1 && (
                <>
                  {activeIndex > 0 && (
                    <button
                      onClick={() => goTo(activeIndex - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white/80 transition-colors"
                      aria-label="Previous card"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  {activeIndex < cards.length - 1 && (
                    <button
                      onClick={() => goTo(activeIndex + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white/80 transition-colors"
                      aria-label="Next card"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Dots */}
            {cards.length > 1 && (
              <div className="flex items-center justify-center gap-2 py-3">
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

            {/* Action buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToContacts}
                className="flex items-center justify-center gap-2 font-body text-sm font-semibold
                           px-4 py-3 rounded-xl bg-brand-accent text-white
                           transition-colors duration-fast hover:bg-brand-accent-hover"
              >
                <UserRoundPlus className="w-4 h-4" />
                Add to Contacts
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 font-body text-sm font-semibold
                           px-4 py-3 rounded-xl border border-brand-border bg-brand-surface text-brand-text
                           transition-colors duration-fast hover:bg-brand-surface-alt"
              >
                <Share2 className="w-4 h-4" />
                {copied ? 'Copied!' : 'Share Card'}
              </button>
            </div>

            {downloadToast && (
              <p className="mt-3 text-center text-sm text-brand-text-secondary animate-in fade-in">
                Contact downloaded — tap the notification to add to your contacts
              </p>
            )}

            {/* Card Editor */}
            {activeCard && (
              <div className="mt-8 rounded-xl border border-brand-border bg-brand-surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-body text-sm font-semibold text-brand-text">
                    Card Settings
                  </h3>
                  <div className="flex items-center gap-2">
                    {cards.length < 3 && (
                      <button
                        onClick={addCard}
                        className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Card
                      </button>
                    )}
                    {cards.length > 1 && (
                      <button
                        onClick={deleteCard}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Card label */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-body text-xs font-medium text-brand-text-secondary">
                      Card Name
                    </label>
                    <span className="font-body text-[10px] text-brand-text-muted tabular-nums">
                      {activeCard.label.length}/30
                    </span>
                  </div>
                  <input
                    type="text"
                    value={activeCard.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    onBlur={handleLabelBlur}
                    maxLength={30}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg
                               font-body text-sm text-brand-text placeholder:text-brand-text-muted
                               focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
                    placeholder="e.g. Work, Personal, Networking"
                  />
                </div>

                {/* Field toggles */}
                <div className="space-y-2.5">
                  <p className="font-body text-xs font-medium text-brand-text-secondary">
                    Visible Fields
                  </p>
                  <FieldToggle
                    icon={User}
                    label="Avatar"
                    checked={activeCard.show_avatar}
                    onChange={() => toggleField('show_avatar')}
                  />
                  <FieldToggle
                    icon={Briefcase}
                    label="Job Title"
                    checked={activeCard.show_job_title}
                    onChange={() => toggleField('show_job_title')}
                  />
                  <FieldToggle
                    icon={FileText}
                    label="Bio"
                    checked={activeCard.show_bio}
                    onChange={() => toggleField('show_bio')}
                  />
                  <FieldToggle
                    icon={Mail}
                    label="Email"
                    checked={activeCard.show_email}
                    onChange={() => toggleField('show_email')}
                    disabled={!user?.email}
                    hint={!user?.email ? 'No email on account' : undefined}
                  />
                  <FieldToggle
                    icon={Phone}
                    label="Phone"
                    checked={activeCard.show_phone}
                    onChange={() => toggleField('show_phone')}
                    disabled={!page?.phone}
                    hint={!page?.phone ? 'Add in profile editor' : undefined}
                  />
                  <FieldToggle
                    icon={Building2}
                    label="Company"
                    checked={activeCard.show_company}
                    onChange={() => toggleField('show_company')}
                    disabled={!page?.company_name}
                    hint={!page?.company_name ? 'Add in profile editor' : undefined}
                  />
                  <FieldToggle
                    icon={MapPin}
                    label="Address"
                    checked={activeCard.show_address}
                    onChange={() => toggleField('show_address')}
                    disabled={!page?.address}
                    hint={!page?.address ? 'Add in profile editor' : undefined}
                  />
                  <FieldToggle
                    icon={Users}
                    label="Social Icons"
                    checked={activeCard.show_socials}
                    onChange={() => toggleField('show_socials')}
                  />
                </div>

                {/* QR Target */}
                <div className="mt-5 pt-4 border-t border-brand-border">
                  <p className="font-body text-xs font-medium text-brand-text-secondary mb-2">
                    QR Code Links To
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (activeCard.qr_target !== 'card') toggleQrTarget();
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                        activeCard.qr_target === 'card'
                          ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                          : 'border-brand-border text-brand-text-secondary hover:bg-brand-surface-alt'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Card Page
                    </button>
                    <button
                      onClick={() => {
                        if (activeCard.qr_target !== 'profile') toggleQrTarget();
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                        activeCard.qr_target === 'profile'
                          ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                          : 'border-brand-border text-brand-text-secondary hover:bg-brand-surface-alt'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Full Profile
                    </button>
                  </div>
                </div>

                {saving && (
                  <p className="mt-2 text-[11px] text-brand-text-muted text-right">Saving...</p>
                )}
                {error && (
                  <p className="mt-2 text-[11px] text-red-500 text-right">{error}</p>
                )}
              </div>
            )}

            {/* Tip */}
            <div className="mt-6 rounded-xl border border-brand-border bg-brand-surface-alt/50 p-4">
              <h3 className="font-body text-sm font-semibold text-brand-text mb-1">
                How it works
              </h3>
              <ul className="font-body text-xs text-brand-text-secondary space-y-1.5">
                <li>
                  <strong className="text-brand-text">Share Card</strong> — Shares your public card page where visitors see your cards with swipe navigation.
                </li>
                <li>
                  <strong className="text-brand-text">Multiple cards</strong> — Create up to 3 cards with different fields visible on each. Great for separating work and personal info.
                </li>
                <li>
                  <strong className="text-brand-text">QR Code</strong> — Choose whether scanning opens your card page or your full BytLinks profile.
                </li>
                <li>
                  <strong className="text-brand-text">Add to Contacts</strong> — Opens the native contact dialog on mobile, or downloads a .vcf file on desktop.
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FieldToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  icon: typeof Mail;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <Icon className="w-4 h-4 text-brand-text-muted shrink-0" />
      <span className="font-body text-sm text-brand-text flex-1">{label}</span>
      {hint && (
        <span className="font-body text-[10px] text-brand-text-muted">{hint}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0 ${
          checked ? 'bg-brand-accent' : 'bg-brand-border'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-[12px] h-[12px] rounded-full bg-white
                     transition-transform duration-200 ${checked ? 'translate-x-[14px]' : ''}`}
        />
      </button>
    </div>
  );
}
