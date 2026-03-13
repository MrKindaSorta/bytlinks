import type { AffiliationBadgeData } from '@bytlinks/shared';

export function AffiliationBadge({ businessUsername, businessName, businessAvatarKey, roleLabel }: AffiliationBadgeData) {
  const avatarUrl = businessAvatarKey
    ? `/api/public/avatar/${businessAvatarKey}`
    : null;

  const initial = (businessName || '?').charAt(0).toUpperCase();

  return (
    <a
      href={`/${businessUsername}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-opacity duration-150 hover:opacity-80"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.06))',
        border: '1px solid rgba(128,128,128,0.1)',
        opacity: 0.75,
        textDecoration: 'none',
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={businessName}
          className="w-5 h-5 rounded-full object-cover shrink-0"
        />
      ) : (
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{
            background: 'var(--page-accent, rgba(128,128,128,0.2))',
            color: 'var(--page-bg, #fff)',
          }}
        >
          {initial}
        </span>
      )}
      <span
        className="text-[11px] font-medium leading-tight truncate"
        style={{ color: 'var(--page-text)', maxWidth: '240px' }}
      >
        {businessName}
        <span style={{ opacity: 0.5 }}> &middot; </span>
        {roleLabel}
      </span>
    </a>
  );
}
