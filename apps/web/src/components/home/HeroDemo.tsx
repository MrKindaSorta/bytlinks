import { useState, useEffect, useCallback } from 'react';
import {
  Twitter, Linkedin, Youtube, Instagram, Github,
  Music2, Twitch, Globe, MessageCircle, Mail,
  ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import logoOnlySrc from '../../logo/BytLinks_logo_only.png';
import { AnimatedBackground } from '../page/AnimatedBackground';

type IconComponent = React.FC<{ className?: string }>;
type LayoutVariant = 'centered' | 'left-photo' | 'right-photo';
type ContentDisplay = 'flow' | 'spotlight' | 'sections' | 'cards';

interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  btnBg: string;
  btnText: string;
  btnBorder: string;
  fontDisplay: string;
  fontBody: string;
  label: string;
  bgEffect?: 'night-sky' | 'fireflies';
}

interface Persona {
  name: string;
  initials: string;
  bio: string;
  animation: string;
  layout: LayoutVariant;
  display: ContentDisplay;
  socials: { key: string; Icon: IconComponent }[];
  links: string[];
  sectionLabels?: string[];
}

const THEMES: ThemeTokens[] = [
  {
    label: 'Gradient Flow',
    bg: 'linear-gradient(135deg, #0f766e 0%, #164e63 50%, #1e3a5f 100%)',
    surface: 'rgba(255,255,255,0.1)',
    surfaceAlt: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.15)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.75)',
    textMuted: 'rgba(255,255,255,0.45)',
    accent: '#ffffff',
    btnBg: 'rgba(255,255,255,0.15)',
    btnText: '#ffffff',
    btnBorder: 'rgba(255,255,255,0.3)',
    fontDisplay: "'Outfit', sans-serif",
    fontBody: "'Outfit', sans-serif",
  },
  {
    label: 'Retro',
    bg: '#f0e6d3',
    surface: '#f7f0e2',
    surfaceAlt: '#e8dcc6',
    border: '#c8b898',
    text: '#2a1f14',
    textSecondary: '#6b5c48',
    textMuted: '#a08e74',
    accent: '#c44d2a',
    btnBg: '#c44d2a',
    btnText: '#f0e6d3',
    btnBorder: 'transparent',
    fontDisplay: "'Syne', sans-serif",
    fontBody: "'Syne', sans-serif",
  },
  {
    label: 'Neon Night',
    bg: '#0a0a12',
    surface: '#12121c',
    surfaceAlt: '#1a1a28',
    border: '#2a2a3c',
    text: '#e8e8f0',
    textSecondary: '#9898b0',
    textMuted: '#5e5e78',
    accent: '#00ff88',
    btnBg: 'transparent',
    btnText: '#00ff88',
    btnBorder: '#00ff88',
    fontDisplay: "'Barlow Condensed', sans-serif",
    fontBody: "'Barlow', sans-serif",
    bgEffect: 'fireflies',
  },
  {
    label: 'Glass',
    bg: '#0f172a',
    surface: 'rgba(255,255,255,0.08)',
    surfaceAlt: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.12)',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#e2e8f0',
    btnBg: 'rgba(255,255,255,0.12)',
    btnText: '#f1f5f9',
    btnBorder: 'rgba(255,255,255,0.18)',
    fontDisplay: "'Outfit', sans-serif",
    fontBody: "'Outfit', sans-serif",
    bgEffect: 'night-sky',
  },
  {
    label: 'Paper',
    bg: '#f5f0e8',
    surface: '#faf6f0',
    surfaceAlt: '#ece6da',
    border: '#d4ccbe',
    text: '#2c2418',
    textSecondary: '#635848',
    textMuted: '#9a8e7e',
    accent: '#2c2418',
    btnBg: '#2c2418',
    btnText: '#f5f0e8',
    btnBorder: 'transparent',
    fontDisplay: "'Zilla Slab', serif",
    fontBody: "'IBM Plex Sans', sans-serif",
  },
];

const PERSONAS: Persona[] = [
  {
    name: 'Maya Chen',
    initials: 'MC',
    bio: 'UX designer & creative strategist. Making the web feel human.',
    animation: 'animate-entrance-slide-up',
    layout: 'centered',
    display: 'flow',
    socials: [
      { key: 'dribbble', Icon: Globe },
      { key: 'instagram', Icon: Instagram },
      { key: 'linkedin', Icon: Linkedin },
    ],
    links: ['My Design Portfolio', 'Book a Consult', 'Latest Case Study', 'Free UI Kit'],
  },
  {
    name: 'Arlo Vega',
    initials: 'AV',
    bio: 'Vintage collector & analog enthusiast. Old soul, new tricks.',
    animation: 'animate-entrance-fade',
    layout: 'left-photo',
    display: 'flow',
    socials: [
      { key: 'youtube', Icon: Youtube },
      { key: 'x', Icon: Twitter },
      { key: 'mail', Icon: Mail },
    ],
    links: ['The Vinyl Blog', 'Shop My Finds', 'Restoration Tips', 'Booking Inquiries'],
  },
  {
    name: 'Kai Natsuki',
    initials: 'KN',
    bio: 'Producer & DJ. 140 BPM is a lifestyle.',
    animation: 'animate-entrance-cascade',
    layout: 'centered',
    display: 'sections',
    sectionLabels: ['Music', 'Shows', 'Merch'],
    socials: [
      { key: 'twitch', Icon: Twitch },
      { key: 'discord', Icon: MessageCircle },
      { key: 'music', Icon: Music2 },
      { key: 'instagram', Icon: Instagram },
    ],
    links: ['Listen on Spotify', 'Upcoming Shows', 'Merch Drop', 'Press Kit'],
  },
  {
    name: 'Sofia Reyes',
    initials: 'SR',
    bio: 'Full-stack dev & open source contributor. Building in public.',
    animation: 'animate-entrance-blur-in',
    layout: 'right-photo',
    display: 'cards',
    sectionLabels: ['Projects', 'Blog', 'Hire Me'],
    socials: [
      { key: 'github', Icon: Github },
      { key: 'x', Icon: Twitter },
      { key: 'linkedin', Icon: Linkedin },
      { key: 'globe', Icon: Globe },
    ],
    links: ['Read My Blog', 'Side Projects', 'Tech Newsletter', 'Hire Me'],
  },
  {
    name: 'Elias Ward',
    initials: 'EW',
    bio: 'Writer & essayist. Words over everything.',
    animation: 'animate-entrance-scale',
    layout: 'centered',
    display: 'spotlight',
    socials: [
      { key: 'mail', Icon: Mail },
      { key: 'x', Icon: Twitter },
      { key: 'globe', Icon: Globe },
    ],
    links: ['Latest Essays', 'Buy My Book', 'Writing Workshop', 'Subscribe'],
  },
];

const CYCLE_MS = 4000;
const FADE_MS = 600;

/* ── Sub-components ── */

function DemoAvatar({ initials, t, size = 72 }: { initials: string; t: ThemeTokens; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold select-none shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.29,
        background: t.surfaceAlt,
        color: t.textMuted,
        fontFamily: t.fontDisplay,
        border: `2px solid ${t.border}`,
      }}
    >
      {initials}
    </div>
  );
}

function DemoSocials({ socials, t, justify = 'justify-center' }: {
  socials: Persona['socials'];
  t: ThemeTokens;
  justify?: string;
}) {
  return (
    <div className={`flex items-center ${justify} gap-2 mb-5`}>
      {socials.map(({ key, Icon }) => (
        <div
          key={key}
          className="w-7 h-7 flex items-center justify-center rounded-full"
          style={{ color: t.text, background: t.surfaceAlt }}
        >
          <Icon className="w-3 h-3" />
        </div>
      ))}
    </div>
  );
}

function DemoLinks({ links, t }: { links: string[]; t: ThemeTokens }) {
  return (
    <div className="space-y-2">
      {links.map((title) => (
        <div
          key={title}
          className="w-full text-center px-4 py-2.5 text-[11px] font-medium rounded-lg"
          style={{
            background: t.btnBg,
            color: t.btnText,
            border: `1.5px solid ${t.btnBorder}`,
            fontFamily: t.fontBody,
          }}
        >
          {title}
        </div>
      ))}
    </div>
  );
}

function DemoBadge({ t }: { t: ThemeTokens }) {
  return (
    <div
      className="flex items-center justify-center gap-1 mt-6"
      style={{ opacity: 0.3, color: t.text }}
    >
      <img src={logoOnlySrc} alt="" className="h-2.5 w-2.5" />
      <span className="text-[8px]" style={{ fontFamily: t.fontBody }}>
        Powered by BytLinks
      </span>
    </div>
  );
}

/* ── Hero layouts ── */

function HeroCentered({ p, t }: { p: Persona; t: ThemeTokens }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">
        <DemoAvatar initials={p.initials} t={t} />
      </div>
      <h3
        className="text-lg font-bold tracking-tight mb-0.5"
        style={{ fontFamily: t.fontDisplay, color: t.text }}
      >
        {p.name}
      </h3>
      <p
        className="text-[11px] leading-relaxed mb-4 px-2"
        style={{ color: t.textSecondary, fontFamily: t.fontBody }}
      >
        {p.bio}
      </p>
      <DemoSocials socials={p.socials} t={t} />
    </div>
  );
}

function HeroSide({ p, t }: { p: Persona; t: ThemeTokens }) {
  const isLeft = p.layout === 'left-photo';
  return (
    <div className={`flex items-start gap-3 ${isLeft ? '' : 'flex-row-reverse'} mb-4`}>
      <DemoAvatar initials={p.initials} t={t} size={64} />
      <div className={`flex-1 min-w-0 pt-0.5 ${isLeft ? 'text-left' : 'text-right'}`}>
        <h3
          className="text-base font-bold tracking-tight mb-0.5"
          style={{ fontFamily: t.fontDisplay, color: t.text }}
        >
          {p.name}
        </h3>
        <p
          className="text-[11px] leading-relaxed mb-3"
          style={{ color: t.textSecondary, fontFamily: t.fontBody }}
        >
          {p.bio}
        </p>
        <DemoSocials
          socials={p.socials}
          t={t}
          justify={isLeft ? 'justify-start' : 'justify-end'}
        />
      </div>
    </div>
  );
}

function DemoHero({ p, t }: { p: Persona; t: ThemeTokens }) {
  if (p.layout === 'centered') return <HeroCentered p={p} t={t} />;
  return <HeroSide p={p} t={t} />;
}

/* ── Content display renderers ── */

function FlowLayout({ p, t }: { p: Persona; t: ThemeTokens }) {
  return (
    <div className="px-6 py-5" style={{ minHeight: 520 }}>
      <DemoHero p={p} t={t} />
      <DemoLinks links={p.links} t={t} />
      <DemoBadge t={t} />
    </div>
  );
}

function SpotlightLayout({ p, t }: { p: Persona; t: ThemeTokens }) {
  return (
    <div className="px-6 flex flex-col justify-center" style={{ minHeight: 520 }}>
      <DemoHero p={p} t={t} />
      <div className="flex flex-col items-center gap-1 mt-4 animate-bounce">
        <ChevronDown className="w-4 h-4 opacity-40" style={{ color: t.text }} />
        <span className="text-[9px] font-medium opacity-30" style={{ color: t.text }}>
          Scroll for links
        </span>
      </div>
    </div>
  );
}

function SectionsLayout({ p, t, activeSection }: { p: Persona; t: ThemeTokens; activeSection: number }) {
  const labels = p.sectionLabels ?? ['Links'];
  return (
    <div style={{ minHeight: 520 }}>
      {/* Section nav tabs */}
      <div className="flex overflow-x-auto px-2" style={{ borderBottom: `1px solid ${t.border}` }}>
        {labels.map((label, i) => (
          <div
            key={label}
            className="shrink-0 px-3 py-2.5 text-[10px] font-medium"
            style={{
              color: t.text,
              opacity: i === activeSection ? 1 : 0.4,
              borderBottom: i === activeSection ? `2px solid ${t.accent}` : '2px solid transparent',
              fontFamily: t.fontBody,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="px-6 py-5">
        <DemoHero p={p} t={t} />
        <DemoLinks links={p.links} t={t} />
        <DemoBadge t={t} />
      </div>
    </div>
  );
}

function CardsLayout({ p, t, activeCard }: { p: Persona; t: ThemeTokens; activeCard: number }) {
  const labels = p.sectionLabels ?? ['Main'];
  const total = labels.length;

  return (
    <div style={{ minHeight: 520 }}>
      <div className="px-6 py-5">
        <DemoHero p={p} t={t} />
        <DemoLinks links={p.links} t={t} />
      </div>

      {/* Card dots + arrows */}
      <div className="flex items-center justify-center gap-3 pb-4">
        <ChevronLeft className="w-3.5 h-3.5" style={{ color: t.text, opacity: activeCard > 0 ? 0.5 : 0.15 }} />
        <div className="flex gap-1.5">
          {labels.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeCard ? 16 : 6,
                height: 6,
                background: t.text,
                opacity: i === activeCard ? 0.7 : 0.2,
              }}
            />
          ))}
        </div>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: t.text, opacity: activeCard < total - 1 ? 0.5 : 0.15 }} />
      </div>
    </div>
  );
}

/* ── Main component ── */

export function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');

  // Animated state for sections/cards demos
  const [activeSection, setActiveSection] = useState(0);
  const [activeCard, setActiveCard] = useState(0);

  const advance = useCallback(() => {
    setPhase('fading-out');
    setTimeout(() => {
      setIndex((prev) => {
        const next = (prev + 1) % THEMES.length;
        setDisplayIndex(next);
        setActiveSection(0);
        setActiveCard(0);
        return next;
      });
      setPhase('fading-in');
      setTimeout(() => {
        setPhase('visible');
      }, FADE_MS);
    }, FADE_MS);
  }, []);

  useEffect(() => {
    const id = setInterval(advance, CYCLE_MS);
    return () => clearInterval(id);
  }, [advance]);

  // Auto-animate sections: cycle through section tabs
  useEffect(() => {
    const p = PERSONAS[displayIndex];
    if (p.display !== 'sections' || phase !== 'visible') return;
    const total = p.sectionLabels?.length ?? 1;
    if (total <= 1) return;
    const timer = setTimeout(() => setActiveSection((prev) => (prev + 1) % total), 1500);
    return () => clearTimeout(timer);
  }, [displayIndex, phase, activeSection]);

  // Auto-animate cards: cycle through cards
  useEffect(() => {
    const p = PERSONAS[displayIndex];
    if (p.display !== 'cards' || phase !== 'visible') return;
    const total = p.sectionLabels?.length ?? 1;
    if (total <= 1) return;
    const timer = setTimeout(() => setActiveCard((prev) => (prev + 1) % total), 1200);
    return () => clearTimeout(timer);
  }, [displayIndex, phase, activeCard]);

  const t = THEMES[displayIndex];
  const p = PERSONAS[displayIndex];

  const contentOpacity = phase === 'fading-out' ? 0 : 1;

  return (
    <div className="mx-auto w-full">
      {/* Phone frame */}
      <div
        className="rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ border: '3px solid rgba(128,128,128,0.12)' }}
      >
        <div
          style={{
            background: t.bg,
            color: t.text,
            fontFamily: t.fontBody,
            transition: `background ${FADE_MS}ms ease, color ${FADE_MS}ms ease`,
            ...(t.bgEffect ? { position: 'relative' as const, '--page-text': t.text, '--page-accent': t.accent } as React.CSSProperties : {}),
          }}
        >
          {/* Status bar + notch */}
          <div className="relative flex items-center justify-center px-6 pt-3 pb-1 z-30">
            <div className="w-[90px] h-[22px] rounded-full bg-black/80" />
          </div>

          {/* Animated background effect */}
          {t.bgEffect && (
            <AnimatedBackground
              effect={t.bgEffect}
              nightSkyConfig={{ shootingStars: 2, staticStars: 45, drift: 8 }}
              firefliesConfig={{ count: 18, speed: 20, glow: 50, pulse: 40 }}
            />
          )}

          {/* Page content */}
          <div
            style={{
              opacity: contentOpacity,
              transition: `opacity ${FADE_MS}ms ease`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              key={`persona-${displayIndex}-${index}`}
              className={p.animation}
              style={{
                '--entrance-duration': '700ms',
                '--entrance-stagger': '80ms',
              } as React.CSSProperties}
            >
              {p.display === 'flow' && <FlowLayout p={p} t={t} />}
              {p.display === 'spotlight' && <SpotlightLayout p={p} t={t} />}
              {p.display === 'sections' && <SectionsLayout p={p} t={t} activeSection={activeSection} />}
              {p.display === 'cards' && <CardsLayout p={p} t={t} activeCard={activeCard} />}
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2.5 pt-1" style={{ position: 'relative', zIndex: 1 }}>
            <div
              className="w-24 h-1 rounded-full"
              style={{
                background: t.text,
                opacity: 0.15,
                transition: `background ${FADE_MS}ms ease`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Theme label below phone */}
      <div className="text-center mt-4 text-[11px] font-medium tracking-wider uppercase font-body text-brand-text-muted">
        {t.label}
      </div>
    </div>
  );
}
