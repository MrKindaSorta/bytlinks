import type { Config } from 'tailwindcss';

/**
 * BytLinks Tailwind Configuration
 *
 * All brand colors use CSS custom properties defined in base.css.
 * Tailwind palette is a utility tool only — never used for brand identity.
 * Banned: Inter, Roboto, Open Sans, Lato, system-ui.
 * Banned brand colors: purple, violet, indigo.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--brand-bg)',
          surface: 'var(--brand-surface)',
          'surface-alt': 'var(--brand-surface-alt)',
          border: 'var(--brand-border)',
          text: 'var(--brand-text)',
          'text-secondary': 'var(--brand-text-secondary)',
          'text-muted': 'var(--brand-text-muted)',
          accent: 'var(--brand-accent)',
          'accent-hover': 'var(--brand-accent-hover)',
          'accent-muted': 'var(--brand-accent-muted)',
        },
        page: {
          bg: 'var(--page-bg)',
          surface: 'var(--page-surface)',
          'surface-alt': 'var(--page-surface-alt)',
          border: 'var(--page-border)',
          text: 'var(--page-text)',
          'text-secondary': 'var(--page-text-secondary)',
          'text-muted': 'var(--page-text-muted)',
          accent: 'var(--page-accent)',
          'accent-hover': 'var(--page-accent-hover)',
          'btn-bg': 'var(--page-btn-bg)',
          'btn-text': 'var(--page-btn-text)',
          'btn-border': 'var(--page-btn-border)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      boxShadow: {
        'brand-sm': 'var(--shadow-sm)',
        'brand-md': 'var(--shadow-md)',
        'brand-lg': 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        'brand-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
