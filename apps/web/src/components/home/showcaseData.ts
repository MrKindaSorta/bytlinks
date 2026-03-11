import {
  Instagram, Youtube, Twitter, Linkedin, Github,
  Music2, Mail, Twitch, Globe,
} from 'lucide-react';

type IconComponent = React.FC<{ className?: string }>;

export interface ShowcasePage {
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

export const SHOWCASE_PAGES: ShowcasePage[] = [
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
