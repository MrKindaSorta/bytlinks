import {
  Twitter, Github, Linkedin, Youtube, Instagram, Music2,
  MessageCircle, Twitch, AtSign, Cloud, Mail, Globe,
} from 'lucide-react';
import type { SocialLink, SocialPlatform, SocialIconStyle, LayoutVariant } from '@bytlinks/shared';
import { trackEvent } from '../../utils/trackEvent';

const ICON_MAP: Record<SocialPlatform, React.FC<{ className?: string }>> = {
  x: Twitter,
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Music2,
  discord: MessageCircle,
  twitch: Twitch,
  mastodon: AtSign,
  threads: AtSign,
  bluesky: Cloud,
  email: Mail,
  website: Globe,
};

function StyledIcon({ platform, iconStyle }: { platform: SocialPlatform; iconStyle: SocialIconStyle }) {
  const Icon = ICON_MAP[platform] ?? Globe;
  const iconSize = 'w-[18px] h-[18px]';
  const wrapper = 'w-9 h-9 flex items-center justify-center';

  switch (iconStyle) {
    case 'circle-outline':
      return (
        <span className={`${wrapper} rounded-full border-2`} style={{ borderColor: 'var(--page-text)', color: 'var(--page-text)' }}>
          <Icon className={iconSize} />
        </span>
      );
    case 'circle-filled':
      return (
        <span className={`${wrapper} rounded-full`} style={{ backgroundColor: 'var(--page-text)', color: 'var(--page-bg)' }}>
          <Icon className={iconSize} />
        </span>
      );
    case 'square-outline':
      return (
        <span className={`${wrapper} rounded-md border-2`} style={{ borderColor: 'var(--page-text)', color: 'var(--page-text)' }}>
          <Icon className={iconSize} />
        </span>
      );
    case 'square-filled':
      return (
        <span className={`${wrapper} rounded-md`} style={{ backgroundColor: 'var(--page-text)', color: 'var(--page-bg)' }}>
          <Icon className={iconSize} />
        </span>
      );
    default:
      return (
        <span className={wrapper} style={{ color: 'var(--page-text)' }}>
          <Icon className={iconSize} />
        </span>
      );
  }
}

interface PageSocialsProps {
  socialLinks: SocialLink[];
  layoutVariant?: LayoutVariant;
  pageId?: string;
}

export function PageSocials({ socialLinks, layoutVariant = 'centered', pageId }: PageSocialsProps) {
  const justifyClass = layoutVariant === 'centered'
    ? 'justify-center'
    : layoutVariant === 'right-photo'
      ? 'justify-end'
      : 'justify-start';

  return (
    <div className={`flex items-center ${justifyClass} gap-2.5 mb-6`}>
      {socialLinks.map((social) => (
        <a
          key={social.id}
          href={social.platform === 'email' ? `mailto:${social.url}` : social.url}
          target={social.platform === 'email' ? undefined : '_blank'}
          rel="noopener noreferrer"
          aria-label={social.platform}
          className="transition-opacity duration-150 hover:opacity-60"
          onClick={() => pageId && trackEvent(pageId, 'social_click', { linkId: social.id })}
        >
          <StyledIcon
            platform={social.platform as SocialPlatform}
            iconStyle={(social.icon_style as SocialIconStyle) ?? 'plain'}
          />
        </a>
      ))}
    </div>
  );
}
