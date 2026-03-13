import { Mail, Phone, Building2, MapPin, Briefcase } from 'lucide-react';
import type { BioPage, LayoutVariant } from '@bytlinks/shared';

interface PageContactInfoProps {
  page: BioPage & { email?: string | null };
  layoutVariant?: LayoutVariant;
  /** Pass user email for editor preview (page object doesn't include it). */
  userEmail?: string;
  /** When true (editor preview), respect show_*_page toggles. On the public page
   *  the API already filters fields, so this isn't needed. */
  isPreview?: boolean;
}

/**
 * Renders contact details (email, phone, company, address) on the public page
 * when the user has toggled them visible via "Show on page" in ProfileEditor.
 */
export function PageContactInfo({ page, layoutVariant = 'centered', userEmail, isPreview }: PageContactInfoProps) {
  const items: { icon: React.ReactNode; label: string; href?: string }[] = [];

  // Job title / profession line (always shown if present)
  const titleParts = [page.job_title, page.profession].filter(Boolean);
  if (titleParts.length > 0) {
    items.push({ icon: <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />, label: titleParts.join(' · ') });
  }

  // Primary email
  const email = page.email ?? (isPreview && page.show_email_page ? userEmail : null);
  if (email) {
    const label = page.email_label ? `${page.email_label}: ${email}` : email;
    items.push({ icon: <Mail className="w-3.5 h-3.5 flex-shrink-0" />, label, href: `mailto:${email}` });
  }

  // Secondary email
  const secondaryEmail = isPreview ? (page.show_secondary_email_page ? page.secondary_email : null) : page.secondary_email;
  if (secondaryEmail) {
    const label = page.secondary_email_label
      ? `${page.secondary_email_label}: ${secondaryEmail}`
      : secondaryEmail;
    items.push({ icon: <Mail className="w-3.5 h-3.5 flex-shrink-0" />, label, href: `mailto:${secondaryEmail}` });
  }

  // Phone
  const phone = isPreview ? (page.show_phone_page ? page.phone : null) : page.phone;
  if (phone) {
    items.push({ icon: <Phone className="w-3.5 h-3.5 flex-shrink-0" />, label: phone, href: `tel:${phone}` });
  }

  // Company
  const company = isPreview ? (page.show_company_page ? page.company_name : null) : page.company_name;
  if (company) {
    items.push({ icon: <Building2 className="w-3.5 h-3.5 flex-shrink-0" />, label: company });
  }

  // Address
  const address = isPreview ? (page.show_address_page ? page.address : null) : page.address;
  if (address) {
    items.push({ icon: <MapPin className="w-3.5 h-3.5 flex-shrink-0" />, label: address });
  }

  if (items.length === 0) return null;

  const alignClass = layoutVariant === 'centered' ? 'items-center' : 'items-start';

  return (
    <div className={`flex flex-col ${alignClass} gap-1.5 mb-6`}>
      {items.map((item, i) => {
        const content = (
          <span className="inline-flex items-center gap-1.5 text-xs leading-relaxed" style={{ opacity: 0.55, color: 'var(--page-text)' }}>
            {item.icon}
            <span>{item.label}</span>
          </span>
        );

        if (item.href) {
          return (
            <a
              key={i}
              href={item.href}
              className="transition-opacity duration-150 hover:opacity-80"
              style={{ color: 'var(--page-text)' }}
            >
              {content}
            </a>
          );
        }

        return <div key={i}>{content}</div>;
      })}
    </div>
  );
}
