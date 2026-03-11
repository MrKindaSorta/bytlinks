import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mail, Phone, Building2, MapPin, UserRoundPlus, ExternalLink,
  ChevronLeft, ChevronRight, Check, Copy,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Theme, SocialLink, BusinessCard } from '@bytlinks/shared';
import { PageShell } from '../components/page/PageShell';
import { PageSocials } from '../components/page/PageSocials';
import { PageBadge } from '../components/page/PageBadge';
import { CardDots } from '../components/page/CardDots';

interface CardPageData {
  page: {
    username: string;
    display_name: string | null;
    bio: string | null;
    job_title: string | null;
    avatar_r2_key: string | null;
    company_name: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    theme: Theme;
    show_branding: boolean;
  };
  cards: BusinessCard[];
  socialLinks: SocialLink[];
}

function CopyableField({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      if (href) window.open(href, '_blank');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)]"
      style={{
        background: 'var(--page-surface, rgba(128,128,128,0.08))',
        border: '1px solid var(--page-border, rgba(128,128,128,0.12))',
      }}
      aria-label={`Copy ${label}: ${value}`}
    >
      <Icon className="w-4 h-4 shrink-0 opacity-50" style={{ color: 'var(--page-text)' }} />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] uppercase tracking-widest font-medium opacity-40" style={{ color: 'var(--page-text)' }}>
          {label}
        </p>
        <p className="text-sm truncate" style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-body)' }}>
          {value}
        </p>
      </div>
      <div className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity">
        {copied ? (
          <Check className="w-3.5 h-3.5" style={{ color: 'var(--page-accent)' }} />
        ) : (
          <Copy className="w-3.5 h-3.5" style={{ color: 'var(--page-text)' }} />
        )}
      </div>
    </button>
  );
}

function SingleCard({
  card,
  page,
  socialLinks,
  cardPageUrl,
  vcardUrl,
  profileUrl,
  staggerIndex,
}: {
  card: BusinessCard;
  page: CardPageData['page'];
  socialLinks: SocialLink[];
  cardPageUrl: string;
  vcardUrl: string;
  profileUrl: string;
  staggerIndex: number;
}) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayName = page.display_name || page.username;
  const avatarUrl = page.avatar_r2_key ? `/api/public/avatar/${page.avatar_r2_key}` : null;

  const qrUrl = card.qr_target === 'profile' ? profileUrl : cardPageUrl;

  const renderQr = useCallback(async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    try {
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch {
      // silent
    }
  }, [qrUrl]);

  useEffect(() => {
    renderQr();
  }, [renderQr]);

  // Build contact items based on card config
  const contactItems: { icon: typeof Mail; label: string; value: string; href?: string }[] = [];

  if (card.show_email && page.email) {
    contactItems.push({ icon: Mail, label: 'Email', value: page.email, href: `mailto:${page.email}` });
  }
  if (card.show_phone && page.phone) {
    contactItems.push({ icon: Phone, label: 'Phone', value: page.phone, href: `tel:${page.phone.replace(/[^\d+]/g, '')}` });
  }
  if (card.show_company && page.company_name) {
    contactItems.push({ icon: Building2, label: 'Company', value: page.company_name });
  }
  if (card.show_address && page.address) {
    contactItems.push({
      icon: MapPin,
      label: 'Address',
      value: page.address,
      href: `https://maps.google.com/?q=${encodeURIComponent(page.address)}`,
    });
  }

  async function handleSaveContact() {
    if (navigator.canShare) {
      try {
        const testFile = new File([''], 'test.vcf', { type: 'text/vcard' });
        if (navigator.canShare({ files: [testFile] })) {
          const res = await fetch(vcardUrl);
          const text = await res.text();
          const file = new File([text], `${page.username}.vcf`, { type: 'text/vcard' });
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
    }
  }

  const baseDelay = staggerIndex * 60;

  return (
    <div className="w-full max-w-[420px] mx-auto px-5">
      {/* Avatar */}
      {card.show_avatar && (
        <div
          className="flex justify-center mb-5 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{ animationDelay: `${baseDelay}ms` }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-28 h-28 rounded-full object-cover"
              style={{
                boxShadow: '0 0 0 3px var(--page-accent, #0d9488), 0 8px 32px rgba(0,0,0,0.12)',
              }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--page-surface-alt, rgba(128,128,128,0.1))',
                boxShadow: '0 0 0 3px var(--page-accent, #0d9488)',
              }}
            >
              <span
                className="text-4xl font-bold opacity-50"
                style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Name */}
      <div
        className="text-center mb-1 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
        style={{ animationDelay: `${baseDelay + 80}ms` }}
      >
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {displayName}
        </h1>
      </div>

      {/* Job title + Company */}
      {(card.show_job_title && page.job_title) && (
        <p
          className="text-center text-sm opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{
            color: 'var(--page-text-secondary, var(--page-text))',
            fontFamily: 'var(--page-font-body)',
            animationDelay: `${baseDelay + 140}ms`,
          }}
        >
          {page.job_title}
        </p>
      )}

      {/* Bio */}
      {card.show_bio && page.bio && (
        <p
          className="text-center text-sm mt-3 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{
            color: 'var(--page-text-secondary, var(--page-text))',
            fontFamily: 'var(--page-font-body)',
            animationDelay: `${baseDelay + 200}ms`,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {page.bio}
        </p>
      )}

      {/* Socials */}
      {card.show_socials && socialLinks.length > 0 && (
        <div
          className="mt-5 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{ animationDelay: `${baseDelay + 260}ms` }}
        >
          <PageSocials socialLinks={socialLinks} layoutVariant="centered" pageId="" />
        </div>
      )}

      {/* Contact details */}
      {contactItems.length > 0 && (
        <div
          className="mt-5 space-y-2 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{ animationDelay: `${baseDelay + 320}ms` }}
        >
          {contactItems.map((item) => (
            <CopyableField key={item.label} {...item} />
          ))}
        </div>
      )}

      {/* QR Code */}
      <div
        className="mt-6 flex justify-center opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
        style={{ animationDelay: `${baseDelay + 380}ms` }}
      >
        <div className="rounded-xl bg-white p-2.5 shadow-sm">
          <canvas ref={qrCanvasRef} className="block" role="img" aria-label={`QR code linking to ${card.qr_target === 'profile' ? 'profile' : 'card page'}`} />
        </div>
      </div>
      <p
        className="text-[10px] text-center mt-1.5 opacity-30"
        style={{ color: 'var(--page-text)' }}
      >
        {card.qr_target === 'profile' ? 'Scan to visit profile' : 'Scan to view card'}
      </p>

      {/* Action buttons */}
      <div
        className="mt-6 grid grid-cols-2 gap-3 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
        style={{ animationDelay: `${baseDelay + 440}ms` }}
      >
        <button
          onClick={handleSaveContact}
          className="flex items-center justify-center gap-2 text-sm font-semibold
                     px-4 py-3 rounded-xl transition-colors duration-150"
          style={{
            background: 'var(--page-accent, #0d9488)',
            color: 'var(--page-btn-text, #fff)',
            fontFamily: 'var(--page-font-body)',
          }}
        >
          <UserRoundPlus className="w-4 h-4" />
          Save Contact
        </button>
        <a
          href={`/${page.username}`}
          className="flex items-center justify-center gap-2 text-sm font-semibold
                     px-4 py-3 rounded-xl transition-colors duration-150 no-underline"
          style={{
            background: 'var(--page-surface, rgba(128,128,128,0.08))',
            color: 'var(--page-text)',
            border: '1px solid var(--page-border, rgba(128,128,128,0.12))',
            fontFamily: 'var(--page-font-body)',
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Full Profile
        </a>
      </div>
    </div>
  );
}

export default function CardPage() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<CardPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/public/${username}/card`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) { setError(json.error || 'Page not found'); return; }
        setData(json.data);
      })
      .catch(() => setError('Failed to load card'))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (data?.page) {
      document.title = data.page.display_name
        ? `${data.page.display_name} — Card | BytLinks`
        : `@${username} — Card | BytLinks`;
    }
    return () => { document.title = 'BytLinks'; };
  }, [data, username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-5 h-5 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <h1 className="font-display text-6xl font-900 tracking-[-0.05em] text-brand-text mb-3">404</h1>
        <p className="font-body text-sm text-brand-text-secondary mb-6">{error || 'This card does not exist.'}</p>
        <a href="/" className="font-body text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150">
          Go to BytLinks
        </a>
      </div>
    );
  }

  const { page, cards, socialLinks } = data;
  const total = cards.length;
  const cardPageUrl = `https://www.bytlinks.com/${username}/card`;
  const profileUrl = `https://www.bytlinks.com/${username}`;
  const vcardUrl = `/api/public/${username}/vcard`;

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(total - 1, index)));
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

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goTo(activeIndex + 1);
      if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, total]);

  const activeCard = cards[activeIndex];

  if (!activeCard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
        <h1 className="font-display text-6xl font-900 tracking-[-0.05em] text-brand-text mb-3">404</h1>
        <p className="font-body text-sm text-brand-text-secondary mb-6">No cards configured yet.</p>
        <a href={`/${username}`} className="font-body text-sm font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150">
          View Profile
        </a>
      </div>
    );
  }

  return (
    <PageShell theme={page.theme}>
      <div
        className="flex-1 flex flex-col justify-center py-12 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Card label when multiple cards */}
        {total > 1 && (
          <p
            className="text-center text-xs font-medium uppercase tracking-widest mb-4 opacity-40"
            style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-body)' }}
          >
            {activeCard.label}
          </p>
        )}

        {/* Active card */}
        <SingleCard
          key={activeCard.id}
          card={activeCard}
          page={page}
          socialLinks={socialLinks}
          cardPageUrl={cardPageUrl}
          vcardUrl={vcardUrl}
          profileUrl={profileUrl}
          staggerIndex={0}
        />

        {/* Desktop arrows */}
        {total > 1 && (
          <div className="hidden md:block">
            {activeIndex > 0 && (
              <button
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-opacity duration-150 hover:opacity-70"
                style={{
                  background: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
                  color: 'var(--page-text)',
                }}
                aria-label="Previous card"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeIndex < total - 1 && (
              <button
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-opacity duration-150 hover:opacity-70"
                style={{
                  background: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
                  color: 'var(--page-text)',
                }}
                aria-label="Next card"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Dots */}
        {total > 1 && (
          <CardDots count={total} active={activeIndex} onDotClick={goTo} />
        )}
      </div>

      {page.show_branding && <PageBadge />}
    </PageShell>
  );
}
