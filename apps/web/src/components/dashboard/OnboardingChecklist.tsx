import { useState, useEffect, useCallback } from 'react';
import { X, Check, Camera, Type, Link2, Palette, Share2, CreditCard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePage } from '../../hooks/usePage';

interface ChecklistItem {
  key: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  done: boolean;
  action?: () => void;
}

export function OnboardingChecklist({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const { page } = usePage();
  const [dismissed, setDismissed] = useState(true);
  const [copied, setCopied] = useState(false);

  // Check if user is new enough (< 14 days) and hasn't dismissed
  useEffect(() => {
    if (!user) return;

    const localDismiss = localStorage.getItem('bytlinks_onboarding_dismissed');
    if (localDismiss === 'true') {
      setDismissed(true);
      return;
    }

    // Check server-side dismissal
    fetch('/api/pages', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          // If account is older than 14 days, auto-dismiss
          const page = json.data?.page;
          if (page) {
            const createdAt = page.created_at * 1000;
            const fourteenDays = 14 * 24 * 60 * 60 * 1000;
            if (Date.now() - createdAt > fourteenDays) {
              setDismissed(true);
              return;
            }
          }
          setDismissed(false);
        }
      })
      .catch(() => setDismissed(true));
  }, [user]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('bytlinks_onboarding_dismissed', 'true');
    // Also persist server-side (fire and forget)
    fetch('/api/auth/dismiss-onboarding', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const handleCopyUrl = useCallback(() => {
    if (!page?.username) return;
    navigator.clipboard.writeText(`https://www.bytlinks.com/${page.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [page?.username]);

  if (dismissed || !page) return null;

  const items: ChecklistItem[] = [
    {
      key: 'avatar',
      label: 'Add a profile photo',
      icon: Camera,
      done: !!page.avatar_r2_key,
    },
    {
      key: 'bio',
      label: 'Write a bio',
      icon: Type,
      done: !!page.bio && page.bio.trim().length > 0,
    },
    {
      key: 'links',
      label: 'Add your first link',
      icon: Link2,
      done: 'link_count' in page ? Number((page as unknown as Record<string, unknown>).link_count) > 0 : false,
    },
    {
      key: 'theme',
      label: 'Pick a theme',
      icon: Palette,
      done: true, // Template picker runs on signup, so this is always done
    },
    {
      key: 'share',
      label: 'Share your page',
      icon: Share2,
      done: false, // Can't really detect this — show copy button
      action: handleCopyUrl,
    },
    {
      key: 'card',
      label: 'Set up your business card',
      icon: CreditCard,
      done: false, // Would need a separate API call to check — keep simple
      action: () => onNavigate?.('card'),
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-700 tracking-tight text-brand-text">
            Get started with BytLinks
          </h3>
          <p className="font-body text-xs text-brand-text-muted mt-0.5">
            {completedCount} of {items.length} complete
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-brand-text-muted hover:text-brand-text transition-colors rounded-lg"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-brand-surface-alt rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-brand-accent rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                transition-colors duration-fast
                ${item.done ? 'opacity-60' : 'hover:bg-brand-surface-alt'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
                ${item.done
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'border border-brand-border text-brand-text-muted'
                }`}
              >
                {item.done ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-2.5 h-2.5" />
                )}
              </div>
              <span className={`font-body text-sm ${item.done ? 'line-through text-brand-text-muted' : 'text-brand-text'}`}>
                {item.label}
              </span>
              {item.key === 'share' && !item.done && (
                <span className="ml-auto font-body text-[11px] text-brand-accent font-medium">
                  {copied ? 'Copied!' : 'Copy URL'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
