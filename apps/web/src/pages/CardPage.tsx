import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Building2, MapPin, UserRoundPlus, ExternalLink,
  Check, Copy, CreditCard,
} from 'lucide-react';
import type { Theme, SocialLink } from '@bytlinks/shared';
import { PageShell } from '../components/page/PageShell';
import { PageSocials } from '../components/page/PageSocials';
import { PageBadge } from '../components/page/PageBadge';

interface CardData {
  id: string;
  label: string;
  show_avatar: boolean;
  show_job_title: boolean;
  show_bio: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_company: boolean;
  show_address: boolean;
  show_socials: boolean;
}

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
  card: CardData;
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

function CardContent({
  card,
  page,
  socialLinks,
  vcardUrl,
}: {
  card: CardData;
  page: CardPageData['page'];
  socialLinks: SocialLink[];
  vcardUrl: string;
}) {
  const displayName = page.display_name || page.username;
  const avatarUrl = page.avatar_r2_key ? `/api/public/avatar/${page.avatar_r2_key}` : null;

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

  return (
    <div className="w-full max-w-[420px] mx-auto px-5">
      {/* Avatar */}
      {card.show_avatar && (
        <div
          className="flex justify-center mb-5 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{ animationDelay: '0ms' }}
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
        style={{ animationDelay: '80ms' }}
      >
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {displayName}
        </h1>
      </div>

      {/* Job title */}
      {card.show_job_title && page.job_title && (
        <p
          className="text-center text-sm opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{
            color: 'var(--page-text-secondary, var(--page-text))',
            fontFamily: 'var(--page-font-body)',
            animationDelay: '140ms',
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
            animationDelay: '200ms',
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
          style={{ animationDelay: '260ms' }}
        >
          <PageSocials socialLinks={socialLinks} layoutVariant="centered" pageId="" />
        </div>
      )}

      {/* Contact details */}
      {contactItems.length > 0 && (
        <div
          className="mt-5 space-y-2 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
          style={{ animationDelay: '320ms' }}
        >
          {contactItems.map((item) => (
            <CopyableField key={item.label} {...item} />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div
        className="mt-6 grid grid-cols-2 gap-3 opacity-0 animate-[cardFadeUp_0.6s_ease_forwards]"
        style={{ animationDelay: '440ms' }}
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
  const { token, username } = useParams<{ token?: string; username?: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CardPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (token) {
      // Token-based route: /c/:token
      fetch(`/api/public/card/${token}`)
        .then((res) => res.json())
        .then((json) => {
          if (!json.success) { setError(json.error || 'Card not found'); return; }
          setData(json.data);
        })
        .catch(() => setError('Failed to load card'))
        .finally(() => setLoading(false));
    } else if (username) {
      // Legacy route: /:username/card → redirect to token-based URL
      fetch(`/api/public/${username}/card`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.redirect) {
            navigate(json.data.redirect, { replace: true });
          } else {
            setError(json.error || 'Card not found');
            setLoading(false);
          }
        })
        .catch(() => { setError('Failed to load card'); setLoading(false); });
    } else {
      setError('Invalid card link');
      setLoading(false);
    }
  }, [token, username, navigate]);

  useEffect(() => {
    if (data?.page) {
      document.title = data.page.display_name
        ? `${data.page.display_name} — Card | BytLinks`
        : `@${data.page.username} — Card | BytLinks`;
    }
    // Prevent search engines from indexing private card pages
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex, nofollow';
    return () => {
      document.title = 'BytLinks';
      if (meta) meta.content = '';
    };
  }, [data]);

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

  const { page, card, socialLinks } = data;
  const displayName = page.display_name || page.username;
  const avatarUrl = page.avatar_r2_key ? `/api/public/avatar/${page.avatar_r2_key}` : null;
  const vcardUrl = `/api/public/${page.username}/vcard`;

  // Interstitial gate — show before revealing card data
  if (!revealed) {
    return (
      <PageShell theme={page.theme}>
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
          <div
            className="w-full max-w-[340px] rounded-2xl p-8 text-center opacity-0 animate-[cardFadeUp_0.5s_ease_forwards]"
            style={{
              background: 'var(--page-surface, rgba(128,128,128,0.08))',
              border: '1px solid var(--page-border, rgba(128,128,128,0.12))',
            }}
          >
            {/* Avatar preview */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                style={{ boxShadow: '0 0 0 3px var(--page-accent, #0d9488)' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'var(--page-surface-alt, rgba(128,128,128,0.1))',
                  boxShadow: '0 0 0 3px var(--page-accent, #0d9488)',
                }}
              >
                <span
                  className="text-2xl font-bold opacity-50"
                  style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <h1
              className="text-lg font-extrabold tracking-tight mb-1"
              style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
            >
              {displayName}
            </h1>
            {card.show_job_title && page.job_title && (
              <p
                className="text-sm opacity-60 mb-6"
                style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-body)' }}
              >
                {page.job_title}
              </p>
            )}
            {!(card.show_job_title && page.job_title) && <div className="mb-6" />}

            <button
              onClick={() => setRevealed(true)}
              className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold
                         px-5 py-3.5 rounded-xl transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'var(--page-accent, #0d9488)',
                color: 'var(--page-btn-text, #fff)',
                fontFamily: 'var(--page-font-body)',
              }}
            >
              <CreditCard className="w-4.5 h-4.5" />
              View {displayName.split(' ')[0]}&apos;s Card
            </button>

            <p
              className="text-[11px] mt-4 opacity-30"
              style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-body)' }}
            >
              Shared via BytLinks
            </p>
          </div>
        </div>
        {page.show_branding && <PageBadge />}
      </PageShell>
    );
  }

  return (
    <PageShell theme={page.theme}>
      <div className="flex-1 flex flex-col justify-center py-12">
        <CardContent
          card={card}
          page={page}
          socialLinks={socialLinks}
          vcardUrl={vcardUrl}
        />
      </div>
      {page.show_branding && <PageBadge />}
    </PageShell>
  );
}
