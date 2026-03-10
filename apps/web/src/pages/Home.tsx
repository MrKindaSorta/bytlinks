import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight, Check, ChevronRight, BarChart2,
  Palette, Globe, Instagram, Youtube, Twitter,
  Linkedin, Github, Music2, Mail, Twitch,
} from 'lucide-react';
import logoSrc from '../logo/BytLinks.png';
import { HeroDemo } from '../components/home/HeroDemo';
import { AnimatedBackground } from '../components/page/AnimatedBackground';

/* ─────────────────────────────────────────────
   Intersection Observer — fires once on enter
───────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Username claim input — the #1 conversion hook
   Typing your desired URL creates ownership before signup.
───────────────────────────────────────────── */
function UsernameClaimInput() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'taken' | 'available'>('idle');
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simulated availability check — replace with real API call
  const checkAvailability = useCallback((username: string) => {
    if (username.length < 2) { setStatus('idle'); return; }
    const taken = ['admin', 'demo', 'test', 'bytlinks'].includes(username.toLowerCase());
    setStatus(taken ? 'taken' : 'available');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.length >= 2) {
      debounceRef.current = setTimeout(() => checkAvailability(raw), 350);
    } else {
      setStatus('idle');
    }
  };

  const handleClaim = () => {
    if (!value || status === 'taken') return;
    navigate(`/signup?username=${encodeURIComponent(value)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClaim();
  };

  return (
    <div className="w-full max-w-md">
      {/* Input row */}
      <div className={`flex items-stretch rounded-xl border-2 overflow-hidden transition-colors duration-150
        ${status === 'available' ? 'border-emerald-500/60' : status === 'taken' ? 'border-red-400/50' : 'border-brand-border'}
        bg-brand-surface focus-within:border-brand-accent`}
      >
        <span className="flex items-center pl-4 font-body text-sm text-brand-text-muted select-none shrink-0 whitespace-nowrap">
          bytlinks.com/
        </span>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="yourname"
          maxLength={30}
          aria-label="Claim your BytLinks username"
          className="flex-1 bg-transparent font-body text-sm text-brand-text placeholder:text-brand-text-muted
                     py-3.5 pr-2 outline-none min-w-0"
        />
        <button
          onClick={handleClaim}
          disabled={!value || status === 'taken'}
          aria-label="Claim username"
          className="px-4 py-2 m-1.5 rounded-lg bg-brand-accent text-white font-body text-sm font-semibold
                     transition-all duration-150 hover:bg-brand-accent-hover
                     disabled:opacity-40 disabled:cursor-not-allowed shrink-0
                     flex items-center gap-1.5 group"
        >
          Claim
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0" />
        </button>
      </div>

      {/* Availability feedback */}
      <div className="mt-2 h-4">
        {status === 'available' && (
          <p className="font-body text-xs text-emerald-500 flex items-center gap-1">
            <Check className="w-3 h-3" /> bytlinks.com/{value} is available
          </p>
        )}
        {status === 'taken' && (
          <p className="font-body text-xs text-red-400">
            That username is taken — try another
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

/** Audience personas — help visitors self-identify. */
const AUDIENCES = [
  {
    role: 'Creators & influencers',
    desc: 'One page for your YouTube, TikTok, merch, brand deals, and everything in between. See exactly what your audience clicks.',
    emoji: '🎬',
  },
  {
    role: 'Freelancers & consultants',
    desc: 'Your portfolio, booking link, services, testimonials, and contact — all in one place that looks better than most websites.',
    emoji: '💼',
  },
  {
    role: 'Musicians & artists',
    desc: 'Latest release, tour dates, merch, socials, streaming links. One link that actually represents your brand.',
    emoji: '🎵',
  },
  {
    role: 'Brands & businesses',
    desc: 'A branded page with your products, social channels, contact info, and embedded content. Converts like a landing page.',
    emoji: '🏢',
  },
];

/** Showcase pages — 6 fake pages, each with a unique theme + background effect. */
type IconComponent = React.FC<{ className?: string }>;

interface ShowcasePage {
  name: string;
  initials: string;
  bio: string;
  links: string[];
  socials: { Icon: IconComponent }[];
  theme: {
    bg: string;
    surface: string;
    border: string;
    text: string;
    textSec: string;
    accent: string;
    btnBg: string;
    btnText: string;
    btnBorder: string;
    fontDisplay: string;
    fontBody: string;
    radius: string;
    btnShadow?: string;
  };
  bgEffect: 'none' | 'night-sky' | 'rain' | 'fireflies' | 'bokeh' | 'waves';
  label: string;
}

const SHOWCASE_PAGES: ShowcasePage[] = [
  {
    name: 'Lena Moreau',
    initials: 'LM',
    bio: 'Product designer at a studio you\'ve heard of. Based in Berlin.',
    links: ['Design Portfolio', 'Case Studies', 'Book a Call'],
    socials: [{ Icon: Instagram }, { Icon: Linkedin }, { Icon: Mail }],
    theme: {
      bg: '#ffffff', surface: '#fafaf9', border: '#e7e5e4',
      text: '#1c1917', textSec: '#78716c', accent: '#1c1917',
      btnBg: '#1c1917', btnText: '#ffffff', btnBorder: 'transparent',
      fontDisplay: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif",
      radius: '10px',
    },
    bgEffect: 'none',
    label: 'Minimal',
  },
  {
    name: 'Kai Natsuki',
    initials: 'KN',
    bio: 'Producer & DJ. 140 BPM is a lifestyle.',
    links: ['Listen on Spotify', 'Upcoming Shows', 'Merch Drop', 'Press Kit'],
    socials: [{ Icon: Twitch }, { Icon: Music2 }, { Icon: Instagram }],
    theme: {
      bg: '#0a0a12', surface: '#12121c', border: '#2a2a3c',
      text: '#e8e8f0', textSec: '#9898b0', accent: '#00ff88',
      btnBg: 'transparent', btnText: '#00ff88', btnBorder: '#00ff88',
      fontDisplay: "'Barlow Condensed', sans-serif", fontBody: "'Barlow', sans-serif",
      radius: '6px',
    },
    bgEffect: 'fireflies',
    label: 'Neon Night',
  },
  {
    name: 'Sofia Reyes',
    initials: 'SR',
    bio: 'Full-stack dev. Building in public.',
    links: ['Read My Blog', 'Side Projects', 'Tech Newsletter'],
    socials: [{ Icon: Github }, { Icon: Twitter }, { Icon: Globe }],
    theme: {
      bg: '#0f172a', surface: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)',
      text: '#f1f5f9', textSec: '#94a3b8', accent: '#e2e8f0',
      btnBg: 'rgba(255,255,255,0.12)', btnText: '#f1f5f9', btnBorder: 'rgba(255,255,255,0.18)',
      fontDisplay: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif",
      radius: '12px',
    },
    bgEffect: 'night-sky',
    label: 'Glass',
  },
  {
    name: 'Arlo Vega',
    initials: 'AV',
    bio: 'Vintage collector & analog soul.',
    links: ['The Vinyl Blog', 'Shop My Finds', 'Restoration Tips'],
    socials: [{ Icon: Youtube }, { Icon: Twitter }, { Icon: Mail }],
    theme: {
      bg: '#fef7f0', surface: '#ffffff', border: '#f0dcc8',
      text: '#3d2c1e', textSec: '#7a6354', accent: '#e07a3a',
      btnBg: '#e07a3a', btnText: '#ffffff', btnBorder: 'transparent',
      fontDisplay: "'Nunito', sans-serif", fontBody: "'Nunito Sans', sans-serif",
      radius: '16px',
    },
    bgEffect: 'bokeh',
    label: 'Soft Warm',
  },
  {
    name: 'Mika Torres',
    initials: 'MT',
    bio: 'Photographer. Light chaser. Story teller.',
    links: ['Gallery', 'Prints Shop', 'Workshop Dates', 'Contact'],
    socials: [{ Icon: Instagram }, { Icon: Youtube }, { Icon: Mail }],
    theme: {
      bg: 'linear-gradient(135deg, #0f766e 0%, #164e63 50%, #1e3a5f 100%)',
      surface: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.15)',
      text: '#ffffff', textSec: 'rgba(255,255,255,0.75)', accent: '#ffffff',
      btnBg: 'rgba(255,255,255,0.15)', btnText: '#ffffff', btnBorder: 'rgba(255,255,255,0.3)',
      fontDisplay: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif",
      radius: '12px',
    },
    bgEffect: 'waves',
    label: 'Gradient Flow',
  },
  {
    name: 'Juno Park',
    initials: 'JP',
    bio: 'WRITER. ZINES. COUNTER-CULTURE.',
    links: ['READ THE ZINE', 'SUBMISSIONS', 'STOCKISTS'],
    socials: [{ Icon: Twitter }, { Icon: Mail }],
    theme: {
      bg: '#ffffff', surface: '#ffffff', border: '#000000',
      text: '#000000', textSec: '#333333', accent: '#000000',
      btnBg: '#000000', btnText: '#ffffff', btnBorder: '#000000',
      fontDisplay: "'JetBrains Mono', monospace", fontBody: "'JetBrains Mono', monospace",
      radius: '0px', btnShadow: '3px 3px 0 #000',
    },
    bgEffect: 'rain',
    label: 'Brutalist',
  },
];

/** Honest comparison: BytLinks vs the old way. */
const COMPARISON_ROWS = [
  { feature: 'Styles that look completely different from each other', us: true, them: false },
  { feature: 'Desktop layout that feels like a real website', us: true, them: false },
  { feature: 'Analytics built in — free, no integrations needed', us: true, them: false },
  { feature: 'Server-side tracking (no privacy-invasive scripts)', us: true, them: false },
  { feature: 'All styles available on the free plan', us: true, them: false },
  { feature: 'Page loads in under one second', us: true, them: false },
  { feature: 'Custom fonts, colors, and button styles', us: true, them: false },
];

/** Testimonials — replace with real ones before launch. */
const TESTIMONIALS = [
  {
    quote: 'My click-through rate doubled after switching. The analytics alone are worth it — I can see exactly which links my audience actually cares about.',
    name: 'Alex Rivera',
    role: 'Creator, 280k followers',
    initials: 'AR',
  },
  {
    quote: 'I\'ve tried every link-in-bio tool. BytLinks is the first one where clients have actually complimented the page itself — not just the links on it.',
    name: 'Sam Okonkwo',
    role: 'Freelance designer',
    initials: 'SO',
  },
  {
    quote: 'Set up in about three minutes. I chose the Editorial theme, picked my fonts, and it looked like I\'d paid a designer. That\'s the whole pitch.',
    name: 'Jordan Lee',
    role: 'Writer & podcaster',
    initials: 'JL',
  },
];

/** Pricing — keep it transparent, reduce signup anxiety. */
const FREE_FEATURES = [
  'All 12 designer themes',
  'Unlimited links',
  'Basic analytics (views + clicks)',
  'Custom colors and fonts',
  'bytlinks.com/username URL',
];
const PRO_FEATURES = [
  'Everything in Free',
  'Full analytics dashboard',
  'Remove "Powered by BytLinks" badge',
  'Advanced color customization',
  'Priority support',
];

/* ─────────────────────────────────────────────
   MINI PAGE PREVIEW — used in showcase section
───────────────────────────────────────────── */
function MiniPagePreview({ page }: { page: ShowcasePage }) {
  const { theme: t, bgEffect } = page;
  const isGradientBg = t.bg.includes('gradient');

  return (
    <div className="shrink-0 flex flex-col items-center gap-2.5">
      <div
        className="shrink-0 w-[210px] h-[340px] overflow-hidden select-none relative"
        style={{
          background: t.bg,
          borderRadius: '20px',
          border: `1.5px solid ${t.border}`,
          '--page-text': t.text,
          '--page-accent': t.accent,
        } as React.CSSProperties}
      >
        {/* Background effect */}
        {bgEffect !== 'none' && (
          <AnimatedBackground
            effect={bgEffect}
            intensity={bgEffect === 'bokeh' ? 30 : bgEffect === 'waves' ? 35 : 50}
            nightSkyConfig={{ shootingStars: 1, staticStars: 30, drift: 6 }}
            firefliesConfig={{ count: 12, speed: 15, glow: 40, pulse: 35 }}
            rainConfig={{ drops: 80, speed: 30, angle: 10, splash: 30 }}
          />
        )}

        {/* Page content */}
        <div className="relative z-[1] px-5 pt-7 pb-4 flex flex-col items-center text-center h-full">
          {/* Avatar */}
          <div
            className="w-12 h-12 flex items-center justify-center font-bold text-sm mb-2.5 shrink-0"
            style={{
              borderRadius: t.radius === '0px' ? '0' : '50%',
              background: isGradientBg ? 'rgba(255,255,255,0.12)' : t.surface,
              color: t.textSec,
              fontFamily: t.fontDisplay,
              border: `1.5px solid ${t.border}`,
            }}
          >
            {page.initials}
          </div>

          {/* Name */}
          <div
            className="text-sm font-bold tracking-tight mb-0.5 leading-tight"
            style={{ color: t.text, fontFamily: t.fontDisplay }}
          >
            {page.name}
          </div>

          {/* Bio */}
          <div
            className="text-[9px] leading-relaxed mb-3 px-1 max-w-[170px]"
            style={{ color: t.textSec, fontFamily: t.fontBody }}
          >
            {page.bio}
          </div>

          {/* Social icons */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {page.socials.map(({ Icon }, i) => (
              <div
                key={i}
                className="w-5 h-5 flex items-center justify-center"
                style={{
                  borderRadius: t.radius === '0px' ? '0' : '50%',
                  background: isGradientBg ? 'rgba(255,255,255,0.08)' : t.surface,
                  color: t.text,
                }}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="w-full space-y-1.5 flex-1">
            {page.links.map((link, i) => (
              <div
                key={i}
                className="w-full text-center px-3 py-[7px] text-[9px] font-medium"
                style={{
                  background: t.btnBg,
                  color: t.btnText,
                  border: `1.5px solid ${t.btnBorder}`,
                  borderRadius: t.radius,
                  fontFamily: t.fontBody,
                  boxShadow: t.btnShadow ?? 'none',
                }}
              >
                {link}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Label below card */}
      <div
        className="font-body text-[11px] font-semibold tracking-wider uppercase text-brand-text-muted"
      >
        {page.label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* ══ STICKY NAV ══ */}
      <nav className="sticky top-0 z-50 bg-brand-bg/85 backdrop-blur-xl border-b border-brand-border/60">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto">
          <a href="/" aria-label="BytLinks home">
            <img src={logoSrc} alt="BytLinks" className="h-14 sm:h-16" />
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="font-body text-sm font-medium text-brand-text-secondary
                         transition-colors duration-150 hover:text-brand-text"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="font-body text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg
                         bg-brand-accent text-white
                         transition-all duration-150 hover:bg-brand-accent-hover"
            >
              Get started — free
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-start">

          {/* Left: copy + username claim */}
          <div>
            {/* Category explainer for newcomers — before the big claim */}
            <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-5">
              Your link-in-bio, done right
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[4.25rem] font-900 tracking-[-0.04em] leading-[1.04] text-brand-text mb-5">
              One link.<br />
              Everything<br />
              <em className="not-italic text-brand-accent">people need.</em>
            </h1>

            {/* "What is this?" — plain English for newcomers to the category */}
            <p className="font-body text-base sm:text-lg text-brand-text-secondary leading-relaxed max-w-[420px] mb-3">
              Put one URL in your Instagram, TikTok, or email bio.
              Visitors land on your personal page — your links, your content, your brand.
              <span className="text-brand-text font-medium"> BytLinks makes that page actually beautiful.</span>
            </p>
            <p className="font-body text-sm text-brand-text-muted max-w-[380px] mb-8 leading-relaxed">
              Think of it as your homepage, without needing a website. Designers, creators,
              freelancers, and brands use it to make a real first impression.
            </p>

            {/* Username claim — primary conversion action */}
            <UsernameClaimInput />

            <p className="font-body text-xs text-brand-text-muted mt-5">
              Free forever · No credit card · Live in 60 seconds
            </p>

            {/* Secondary CTA for people who want to look first */}
            <div className="mt-5">
              <Link
                to="/demo"
                className="font-body text-sm font-medium text-brand-text-secondary
                           hover:text-brand-text transition-colors duration-150
                           flex items-center gap-1 group w-fit"
              >
                See an example page
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Right: live page preview */}
          <div className="flex justify-center lg:justify-end lg:pt-2">
            <div className="w-full max-w-[280px] sm:max-w-[310px]">
              <HeroDemo />
            </div>
          </div>
        </div>
      </main>

      {/* ══ CONCEPT BAR — reinforces the "what is this?" for scrollers ══ */}
      <section className="border-y border-brand-border bg-brand-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x divide-brand-border">
            {[
              { icon: Globe, label: 'One URL for everything', body: 'Share a single link — your page holds all your links, social profiles, and content.' },
              { icon: Palette, label: 'Looks like you designed it', body: '12 completely different aesthetics. Pick one, customize it, and it\'s yours.' },
              { icon: BarChart2, label: 'Real analytics, built in', body: 'See your views, clicks, countries, and referrers. No extra tools required.' },
            ].map(({ icon: Icon, label, body }) => (
              <div key={label} className="flex items-start gap-4 sm:px-8 first:sm:pl-0 last:sm:pr-0">
                <div className="w-9 h-9 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-[18px] h-[18px] text-brand-accent" />
                </div>
                <div>
                  <div className="font-display text-sm font-700 text-brand-text mb-1">{label}</div>
                  <div className="font-body text-xs text-brand-text-secondary leading-relaxed">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STYLE SHOWCASE — real fake pages proving aesthetic diversity ══ */}
      <section className="py-20 sm:py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-10">
          <FadeIn>
            <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
              12 distinct styles
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text max-w-sm">
                Not twelve color swaps.<br />Twelve completely different looks.
              </h2>
              <p className="font-body text-sm text-brand-text-secondary max-w-xs leading-relaxed">
                Each theme has its own typography system, layout behavior, and spacing philosophy.
                All available on the free plan.
              </p>
            </div>
          </FadeIn>
        </div>

        {/* Horizontally scrollable showcase of real-looking pages */}
        <FadeIn delay={100}>
          <div
            className="flex gap-5 overflow-x-auto pb-4 pl-4 sm:pl-[calc((100vw-72rem)/2+1.5rem)] pr-6"
            style={{ scrollbarWidth: 'none' }}
          >
            {SHOWCASE_PAGES.map((page) => (
              <MiniPagePreview key={page.label} page={page} />
            ))}
          </div>
        </FadeIn>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
          <FadeIn delay={150}>
            <Link
              to="/signup"
              className="font-body text-sm font-medium text-brand-text-secondary
                         hover:text-brand-text transition-colors duration-150
                         flex items-center gap-1 group w-fit"
            >
              More styles, backgrounds, and customization options inside
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ══ WHO IT'S FOR — audience self-identification ══ */}
      <section className="bg-brand-surface border-y border-brand-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
                Who it's for
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
                Built for anyone with something worth sharing
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {AUDIENCES.map((a, i) => (
              <FadeIn key={a.role} delay={i * 70}>
                <div className="group flex items-start gap-5 p-6 rounded-xl border border-brand-border
                                bg-brand-bg transition-all duration-200
                                hover:border-brand-accent/30 hover:shadow-brand-sm">
                  <span className="text-3xl leading-none mt-0.5" aria-hidden>{a.emoji}</span>
                  <div>
                    <h3 className="font-display text-base font-700 text-brand-text mb-1.5">{a.role}</h3>
                    <p className="font-body text-sm text-brand-text-secondary leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <FadeIn>
          <div className="mb-14">
            <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
              Setup
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
              Live in under a minute
            </h2>
          </div>
        </FadeIn>

        {/* Steps — editorial numbered layout, not icon cards */}
        <div className="space-y-0 divide-y divide-brand-border">
          {[
            {
              num: '01',
              title: 'Claim your page',
              desc: 'Choose your username. It becomes bytlinks.com/you — instantly, no approval needed. Free, no credit card required.',
              cta: null,
            },
            {
              num: '02',
              title: 'Pick your look',
              desc: 'Choose from 12 design styles. Each one has preset color palettes, but you can override everything — fonts, colors, button shapes.',
              cta: null,
            },
            {
              num: '03',
              title: 'Add your links',
              desc: 'Drop in your URLs. Reorder them by drag. Toggle which ones are featured. Add social icons. Embed YouTube or Spotify.',
              cta: null,
            },
            {
              num: '04',
              title: 'Share the one link',
              desc: 'Put your BytLinks URL everywhere. Watch the analytics come in — where people are from, what they\'re clicking, which links perform.',
              cta: { label: 'Claim your page now', to: '/signup' },
            },
          ].map((step, i) => (
            <FadeIn key={step.num} delay={i * 80}>
              <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr] gap-4 sm:gap-8 py-8 sm:py-10 items-start">
                <div className="font-display text-3xl sm:text-4xl font-900 text-brand-accent/20 leading-none pt-1 select-none">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-700 text-brand-text mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="font-body text-sm sm:text-base text-brand-text-secondary leading-relaxed max-w-lg">
                    {step.desc}
                  </p>
                  {step.cta && (
                    <Link
                      to={step.cta.to}
                      className="inline-flex items-center gap-2 mt-4 font-body text-sm font-semibold
                                 text-brand-accent hover:text-brand-accent-hover transition-colors duration-150 group"
                    >
                      {step.cta.label}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ COMPARISON — honest side-by-side ══ */}
      <section className="bg-brand-surface border-y border-brand-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
                The difference
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text">
                Most link pages are an afterthought.
                <br className="hidden sm:block" />
                <span className="text-brand-accent"> BytLinks is the point.</span>
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="rounded-xl border border-brand-border overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto] bg-brand-bg border-b border-brand-border
                              px-4 sm:px-6 py-3 gap-4 sm:gap-8">
                <div className="font-body text-xs text-brand-text-muted" />
                <div className="font-display text-sm font-700 text-brand-text w-20 sm:w-28 text-center">BytLinks</div>
                <div className="font-body text-sm text-brand-text-muted w-20 sm:w-28 text-center">The rest</div>
              </div>
              {COMPARISON_ROWS.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[1fr_auto_auto] items-center px-4 sm:px-6 py-4 gap-4 sm:gap-8
                    border-b last:border-0 border-brand-border
                    ${i % 2 === 0 ? 'bg-brand-surface' : 'bg-brand-bg'}`}
                >
                  <p className="font-body text-sm text-brand-text-secondary">{row.feature}</p>
                  <div className="w-20 sm:w-28 flex justify-center">
                    <div className="w-5 h-5 rounded-full bg-brand-accent/15 flex items-center justify-center">
                      <Check className="w-3 h-3 text-brand-accent" />
                    </div>
                  </div>
                  <div className="w-20 sm:w-28 flex justify-center">
                    <div className="w-4 h-0.5 rounded bg-brand-text-muted/30" aria-label="Not available" />
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ TESTIMONIALS — real-feeling, structured, attributed ══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <FadeIn>
          <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
            What people say
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text mb-12">
            People actually compliment the page now
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 80}>
              <div className="flex flex-col gap-5 p-6 rounded-xl border border-brand-border bg-brand-surface h-full">
                {/* Quote */}
                <blockquote className="font-body text-sm text-brand-text-secondary leading-relaxed flex-1">
                  "{t.quote}"
                </blockquote>
                {/* Attribution */}
                <div className="flex items-center gap-3 pt-2 border-t border-brand-border">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/15 flex items-center justify-center shrink-0">
                    <span className="font-display text-xs font-700 text-brand-accent">{t.initials}</span>
                  </div>
                  <div>
                    <div className="font-body text-sm font-semibold text-brand-text">{t.name}</div>
                    <div className="font-body text-xs text-brand-text-muted">{t.role}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Note: Replace TESTIMONIALS with real user quotes before launch */}
      </section>

      {/* ══ PRICING CLARITY — reduce signup anxiety ══ */}
      <section className="bg-brand-surface border-y border-brand-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="font-body text-sm font-medium uppercase tracking-[0.14em] text-brand-accent mb-3">
                Pricing
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-brand-text mb-3">
                Free is actually free
              </h2>
              <p className="font-body text-base text-brand-text-secondary max-w-md mx-auto">
                No features locked behind a 7-day trial. The free plan isn't a demo.
                Upgrade when analytics matter more.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {/* Free tier */}
              <div className="p-6 sm:p-8 rounded-xl border border-brand-border bg-brand-bg">
                <div className="mb-1">
                  <span className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">Free plan</span>
                </div>
                <div className="font-display text-4xl font-900 text-brand-text tracking-tight mb-1">$0</div>
                <div className="font-body text-sm text-brand-text-muted mb-6">forever, no credit card</div>
                <ul className="space-y-2.5 mb-8">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                      <span className="font-body text-sm text-brand-text-secondary">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="block w-full text-center font-body text-sm font-semibold py-3 rounded-lg
                             border border-brand-border text-brand-text
                             transition-all duration-150 hover:border-brand-accent/50 hover:bg-brand-surface"
                >
                  Get started free
                </Link>
              </div>

              {/* Pro tier */}
              <div className="p-6 sm:p-8 rounded-xl border-2 border-brand-accent/40 bg-brand-bg relative">
                <div className="absolute top-4 right-4">
                  <span className="font-body text-xs font-semibold px-2.5 py-1 rounded-full
                                   bg-brand-accent/10 text-brand-accent">Popular</span>
                </div>
                <div className="mb-1">
                  <span className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">Pro plan</span>
                </div>
                <div className="font-display text-4xl font-900 text-brand-text tracking-tight mb-1">
                  $<span className="text-brand-text-muted text-lg">[price]</span>
                </div>
                <div className="font-body text-sm text-brand-text-muted mb-6">per month</div>
                <ul className="space-y-2.5 mb-8">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                      <span className="font-body text-sm text-brand-text-secondary">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="block w-full text-center font-body text-sm font-semibold py-3 rounded-lg
                             bg-brand-accent text-white
                             transition-all duration-150 hover:bg-brand-accent-hover"
                >
                  Start free, upgrade anytime
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FINAL CTA — clean, no gradient block ══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <FadeIn>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            {/* Left: copy */}
            <div className="max-w-xl">
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-900 tracking-[-0.03em] text-brand-text leading-[1.1] mb-4">
                Your page is one<br />
                minute away.
              </h2>
              <p className="font-body text-base sm:text-lg text-brand-text-secondary leading-relaxed">
                Free forever. Every style included. Your analytics working from day one.
                No design skills required — but it'll look like you have them.
              </p>
            </div>

            {/* Right: claim input + CTAs */}
            <div className="shrink-0 w-full lg:w-auto lg:min-w-[340px]">
              <UsernameClaimInput />
              <p className="font-body text-xs text-brand-text-muted mt-3">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-accent hover:underline">Log in</Link>
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-brand-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <img src={logoSrc} alt="BytLinks" className="h-10 mb-2" />
              <p className="font-body text-xs text-brand-text-muted max-w-xs leading-relaxed">
                A fast, beautiful bio page for creators, freelancers, and brands.
                Your link. Your brand. Your data.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer navigation">
              {[
                { label: 'Log in', to: '/login' },
                { label: 'Sign up', to: '/signup' },
                { label: 'Demo', to: '/demo' },
              ].map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="font-body text-sm text-brand-text-muted hover:text-brand-text
                             transition-colors duration-150"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-brand-border flex flex-col sm:flex-row
                          items-center justify-between gap-2">
            <p className="font-body text-xs text-brand-text-muted">
              &copy; {new Date().getFullYear()} BytLinks. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="font-body text-xs text-brand-text-muted hover:text-brand-text transition-colors">Privacy</Link>
              <Link to="/terms" className="font-body text-xs text-brand-text-muted hover:text-brand-text transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
