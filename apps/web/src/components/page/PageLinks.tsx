import type { Link as LinkType, ButtonStyle, LinkIconStyle, LinkIconPosition } from '@bytlinks/shared';
import { getLinkIcon } from '../../utils/linkIconMap';

interface PageLinksProps {
  links: LinkType[];
  buttonStyle: ButtonStyle;
  pageId?: string;
  /** When set, clicks call this instead of navigating. Used by appearance preview for link selection. */
  onLinkClick?: (linkId: string) => void;
  /** Highlights the selected link with a ring. Used with onLinkClick. */
  selectedLinkId?: string | null;
  /** Shows a dot indicator on links with style_overrides. Used by appearance preview. */
  showOverrideDots?: boolean;
  /** When true, returns a React fragment of individual link elements instead of a wrapping div.
   *  Used for 2-column grid layout where each link should be its own grid cell. */
  asFragment?: boolean;
}

function getButtonClasses(style: ButtonStyle): string {
  const base = 'block w-full px-5 py-4 font-medium text-sm transition-transform duration-150 hover:scale-[1.02]';

  switch (style) {
    case 'filled': return `${base} rounded-lg`;
    case 'outline': return `${base} rounded-lg bg-transparent`;
    case 'outline-sharp': return `${base} rounded-none bg-transparent`;
    case 'pill': return `${base} rounded-full`;
    case 'pill-outline': return `${base} rounded-full bg-transparent`;
    case 'underline': return `${base} rounded-none bg-transparent border-b-2 border-l-0 border-r-0 border-t-0`;
    case 'ghost': return `${base} rounded-lg`;
    case 'shadow': return `${base} rounded-lg`;
    case 'brutalist': return `${base} rounded-none`;
    case 'gradient': return `${base} rounded-lg`;
    case 'soft': return `${base} rounded-xl`;
    default: return `${base} rounded-lg`;
  }
}

function getButtonStyle(style: ButtonStyle, link?: LinkType): React.CSSProperties {
  const o = link?.style_overrides;
  const base: React.CSSProperties = {
    background: o?.buttonBg ?? 'var(--page-btn-bg)',
    color: o?.buttonText ?? 'var(--page-btn-text)',
    border: '1px solid var(--page-btn-border, transparent)',
  };

  switch (style) {
    case 'outline':
    case 'outline-sharp':
    case 'pill-outline':
      return { ...base, background: 'transparent', color: o?.buttonText ?? 'var(--page-text)', border: '1.5px solid var(--page-btn-border, var(--page-text))' };
    case 'underline':
      return { ...base, background: 'transparent', color: o?.buttonText ?? 'var(--page-text)', borderBottom: '2px solid var(--page-accent)' };
    case 'ghost':
      return { ...base, background: o?.buttonBg ?? 'var(--page-surface-alt, rgba(128,128,128,0.08))', color: o?.buttonText ?? 'var(--page-text)', border: 'none' };
    case 'shadow':
      return { ...base, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' };
    case 'brutalist':
      return { ...base, border: '2px solid var(--page-text)', boxShadow: '4px 4px 0 var(--page-text)' };
    case 'soft':
      return { ...base, background: o?.buttonBg ?? 'var(--page-surface-alt, rgba(128,128,128,0.08))', color: o?.buttonText ?? 'var(--page-accent)', border: 'none' };
    default:
      return base;
  }
}

function trackClick(pageId: string, linkId: string) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id: pageId, link_id: linkId, event_type: 'link_click' }),
    keepalive: true,
  }).catch(() => {});
}

function PageLinkIcon({ iconName, iconStyle }: { iconName: string; iconStyle: LinkIconStyle }) {
  const Icon = getLinkIcon(iconName);
  if (!Icon) return null;
  const cls = 'w-[1.1em] h-[1.1em]';
  const wrap = 'w-7 h-7 flex items-center justify-center shrink-0';

  switch (iconStyle) {
    case 'circle-outline':
      return <span className={`${wrap} rounded-full`} style={{ border: '1.5px solid currentColor' }}><Icon className={cls} /></span>;
    case 'circle-filled':
      return <span className={`${wrap} rounded-full`} style={{ backgroundColor: 'var(--page-text)', color: 'var(--page-bg)' }}><Icon className={cls} /></span>;
    case 'square-outline':
      return <span className={`${wrap} rounded-[4px]`} style={{ border: '1.5px solid currentColor' }}><Icon className={cls} /></span>;
    case 'square-filled':
      return <span className={`${wrap} rounded-[4px]`} style={{ backgroundColor: 'var(--page-text)', color: 'var(--page-bg)' }}><Icon className={cls} /></span>;
    default:
      return <Icon className={cls} />;
  }
}

export function PageLinks({ links, buttonStyle, pageId, onLinkClick, selectedLinkId, showOverrideDots, asFragment }: PageLinksProps) {
  const featured = links.filter((l) => l.is_featured && l.is_visible);
  const regular = links.filter((l) => !l.is_featured && l.is_visible);

  function renderLink(link: LinkType) {
    const effectiveStyle = link.style_overrides?.buttonStyle ?? buttonStyle;
    const iconName = link.icon;
    const iconStyle: LinkIconStyle = link.style_overrides?.iconStyle ?? 'plain';
    const iconPosition: LinkIconPosition = link.style_overrides?.iconPosition ?? 'left';
    const hasIcon = !!iconName;
    const isSelected = selectedLinkId === link.id;
    const hasOverrides = !!link.style_overrides;

    const iconNode = hasIcon ? <PageLinkIcon iconName={iconName} iconStyle={iconStyle} /> : null;

    let content: React.ReactNode;
    if (hasIcon && iconPosition === 'only') {
      content = <span className="flex items-center justify-center">{iconNode}</span>;
    } else if (hasIcon && iconPosition === 'above') {
      content = <span className="flex flex-col items-center gap-1">{iconNode}<span>{link.title}</span></span>;
    } else {
      content = (
        <span className={`flex items-center justify-center gap-2 ${iconPosition === 'right' ? 'flex-row-reverse' : ''}`}>
          {iconNode}
          <span>{link.title}</span>
        </span>
      );
    }

    const classes = getButtonClasses(effectiveStyle);
    const inlineStyle: React.CSSProperties = {
      ...getButtonStyle(effectiveStyle, link),
      ...(isSelected ? { boxShadow: '0 0 0 2px var(--page-bg), 0 0 0 4px #0d9488' } : {}),
    };

    // Interactive preview mode: render as button with selection support
    if (onLinkClick) {
      return (
        <div key={link.id} className="relative group">
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onLinkClick(link.id); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onLinkClick(link.id); } }}
            className={`${classes} cursor-pointer`}
            style={{ ...inlineStyle, outline: 'none' }}
          >
            {content}
          </div>
          {!isSelected && (
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.35)', borderRadius: getButtonRadius(effectiveStyle) }}
            >
              <span className="text-white text-[10px] font-semibold tracking-wide uppercase">Click to edit</span>
            </div>
          )}
          {showOverrideDots && hasOverrides && !isSelected && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-accent border-2 pointer-events-none"
              style={{ borderColor: 'var(--page-bg)' }} />
          )}
        </div>
      );
    }

    // Normal mode: render as link
    return (
      <a
        key={link.id}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => pageId && trackClick(pageId, link.id)}
        className={classes}
        style={inlineStyle}
        title={hasIcon && iconPosition === 'only' ? link.title : undefined}
      >
        {content}
      </a>
    );
  }

  if (asFragment) {
    return (
      <>
        {featured.map(renderLink)}
        {regular.map(renderLink)}
      </>
    );
  }

  return (
    <div>
      {featured.length > 0 ? (
        <div className="mb-4 space-y-3">
          {featured.map(renderLink)}
        </div>
      ) : null}
      <div className="space-y-3">
        {regular.map(renderLink)}
      </div>
    </div>
  );
}

function getButtonRadius(style: ButtonStyle): string {
  switch (style) {
    case 'outline-sharp': case 'underline': case 'brutalist': return '0';
    case 'pill': case 'pill-outline': return '999px';
    case 'soft': return '12px';
    default: return '8px';
  }
}
