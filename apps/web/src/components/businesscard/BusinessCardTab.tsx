import { useRef, useEffect, useCallback, useState } from 'react';
import { UserRoundPlus, Mail, Phone, Building2, MapPin, QrCode, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { usePage } from '../../hooks/usePage';
import { useAuth } from '../../hooks/useAuth';

export function BusinessCardTab() {
  const { page } = usePage();
  const { user } = useAuth();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const username = page?.username ?? '';
  const pageUrl = `https://www.bytlinks.com/${username}`;
  const vcardUrl = `/api/public/${username}/vcard`;

  const avatarUrl = page?.avatar_r2_key
    ? `/api/public/avatar/${page.avatar_r2_key}`
    : null;

  const displayName = page?.display_name || username;

  const renderQr = useCallback(async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !username) return;
    try {
      await QRCode.toCanvas(canvas, pageUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch {
      // silent
    }
  }, [pageUrl, username]);

  useEffect(() => {
    renderQr();
  }, [renderQr]);

  async function handleAddToContacts() {
    // Try Web Share API with .vcf file first (best on mobile — opens native share sheet)
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
        // User cancelled or share failed — fall through to direct link
      }
    }
    // Fallback: open vcard URL directly (iOS Safari shows contact preview sheet)
    window.open(vcardUrl, '_self');
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} - Contact Card`,
          url: pageUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!page) return null;

  const contactItems: { icon: typeof Mail; label: string; value: string; href?: string }[] = [];

  if (page.show_email_card && user?.email) {
    contactItems.push({
      icon: Mail,
      label: 'Email',
      value: user.email,
      href: `mailto:${user.email}`,
    });
  }
  if (page.show_phone_card && page.phone) {
    contactItems.push({
      icon: Phone,
      label: 'Phone',
      value: page.phone,
      href: `tel:${page.phone.replace(/[^\d+]/g, '')}`,
    });
  }
  if (page.show_company_card && page.company_name) {
    contactItems.push({
      icon: Building2,
      label: 'Company',
      value: page.company_name,
    });
  }
  if (page.show_address_card && page.address) {
    contactItems.push({
      icon: MapPin,
      label: 'Address',
      value: page.address,
    });
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
        <p className="font-body text-sm text-brand-text-secondary mb-8">
          Your digital business card. Share it via QR code or download as a contact file.
        </p>

        {/* Card Preview */}
        <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-[#1a1a2e] to-[#16213e]
                        shadow-xl overflow-hidden">
          {/* Card top section */}
          <div className="px-6 pt-8 pb-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
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

              {/* Name + title */}
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-xl font-800 text-white tracking-tight leading-tight truncate">
                  {displayName}
                </h2>
                {page.job_title && (
                  <p className="text-sm text-white/60 mt-0.5 truncate">{page.job_title}</p>
                )}
                {page.show_company_card && page.company_name && (
                  <p className="text-sm font-medium text-white/40 mt-0.5 truncate">{page.company_name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 border-t border-white/10" />

          {/* Contact details + QR code */}
          <div className="px-6 py-5 flex gap-5">
            {/* Contact list */}
            <div className="flex-1 min-w-0 space-y-3">
              {contactItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-start gap-2.5 group">
                    <Icon className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-white/30 font-medium">{item.label}</p>
                      <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
                return item.href ? (
                  <a key={item.label} href={item.href} className="block">
                    {content}
                  </a>
                ) : (
                  <div key={item.label}>{content}</div>
                );
              })}

              {contactItems.length === 0 && (
                <p className="text-sm text-white/30 italic">
                  No contact info visible on card. Add details in your profile editor.
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="rounded-lg bg-white p-2">
                <canvas ref={qrCanvasRef} className="block" />
              </div>
              <p className="text-[10px] text-white/30 mt-1.5 text-center">Scan to visit</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-white/5 border-t border-white/10">
            <p className="text-[11px] text-white/25 text-center tracking-wide">
              bytlinks.com/{username}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
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
            {copied ? 'Copied!' : 'Share Link'}
          </button>
        </div>

        {/* Tip */}
        <div className="mt-6 rounded-xl border border-brand-border bg-brand-surface-alt/50 p-4">
          <h3 className="font-body text-sm font-semibold text-brand-text mb-1">
            How it works
          </h3>
          <ul className="font-body text-xs text-brand-text-secondary space-y-1.5">
            <li>
              <strong className="text-brand-text">QR Code</strong> — Others scan it to open your BytLinks page instantly.
            </li>
            <li>
              <strong className="text-brand-text">Add to Contacts</strong> — Opens the native contact dialog on mobile, or downloads a .vcf file on desktop.
            </li>
            <li>
              <strong className="text-brand-text">Visibility toggles</strong> — Control what shows on your page vs. your card in the profile editor above.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
