import logoOnlySrc from '../../logo/BytLinks_logo_only.png';

/**
 * "Powered by BytLinks" badge — always pinned to bottom center of the page.
 */
export function PageBadge() {
  return (
    <div className="w-full flex justify-center py-6 mt-auto">
      <a
        href="/"
        className="inline-flex items-center gap-1.5 opacity-30 hover:opacity-50
                   transition-opacity duration-150"
        style={{ color: 'var(--page-text)' }}
      >
        <img src={logoOnlySrc} alt="" className="h-4 w-4" />
        <span className="text-[11px] tracking-wide">Powered by BytLinks</span>
      </a>
    </div>
  );
}
