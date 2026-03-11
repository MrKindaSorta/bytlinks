import { Link } from 'react-router-dom';
import logoSrc from '../../logo/BytLinks.png';

export function Footer() {
  return (
    <footer className="border-t border-brand-accent/20">
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
                className="font-body text-sm text-brand-text-muted hover:text-brand-text transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-2">
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
  );
}
