import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, Share, MoreVertical } from 'lucide-react';

type Tab = 'android' | 'iphone';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): Tab {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'iphone';
  return 'android';
}

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function InstallAppSection() {
  const [tab, setTab] = useState<Tab>(detectPlatform);
  const [standalone, setStandalone] = useState(isStandaloneMode);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);

    // Listen for app being installed
    function handleInstalled() {
      setDeferredPrompt(null);
      setStandalone(true);
    }
    window.addEventListener('appinstalled', handleInstalled);

    // Listen for display mode change
    const mq = window.matchMedia('(display-mode: standalone)');
    function handleDisplayChange(e: MediaQueryListEvent) {
      setStandalone(e.matches);
    }
    mq.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      mq.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch {
      // Prompt dismissed or failed
    } finally {
      setInstalling(false);
    }
  }

  const tabClass = (t: Tab) =>
    `font-body text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-fast ${
      tab === t
        ? 'bg-brand-accent text-white'
        : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg'
    }`;

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
      <div className="flex items-center gap-2 mb-2">
        <Smartphone className="w-5 h-5 text-brand-accent" />
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
          Install as App
        </h2>
      </div>
      <p className="font-body text-sm text-brand-text-secondary mb-6">
        Add BytLinks to your home screen for quick access — just like a native app.
      </p>

      {standalone ? (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-body text-sm font-medium text-emerald-800">
              You're using BytLinks as an app!
            </div>
            <div className="font-body text-xs text-emerald-600 mt-0.5">
              BytLinks is installed on your device.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Platform tabs */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setTab('android')} className={tabClass('android')}>
              Android
            </button>
            <button onClick={() => setTab('iphone')} className={tabClass('iphone')}>
              iPhone
            </button>
          </div>

          {tab === 'android' ? (
            <div className="space-y-4">
              {deferredPrompt && (
                <>
                  <button
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                               bg-brand-accent text-white
                               transition-colors duration-fast hover:bg-brand-accent-hover
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {installing ? 'Installing...' : 'Install BytLinks'}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-brand-border" />
                    <span className="font-body text-xs text-brand-text-muted">or manually</span>
                    <div className="flex-1 border-t border-brand-border" />
                  </div>
                </>
              )}
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent font-body text-xs font-semibold flex items-center justify-center">
                    1
                  </span>
                  <span className="font-body text-sm text-brand-text pt-0.5">
                    Open BytLinks in <span className="font-semibold">Chrome</span> and tap the
                    menu <MoreVertical className="w-3.5 h-3.5 inline -mt-0.5" /> button
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent font-body text-xs font-semibold flex items-center justify-center">
                    2
                  </span>
                  <span className="font-body text-sm text-brand-text pt-0.5">
                    Tap <span className="font-semibold">"Add to Home screen"</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent font-body text-xs font-semibold flex items-center justify-center">
                    3
                  </span>
                  <span className="font-body text-sm text-brand-text pt-0.5">
                    Tap <span className="font-semibold">"Install"</span>
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent font-body text-xs font-semibold flex items-center justify-center">
                  1
                </span>
                <span className="font-body text-sm text-brand-text pt-0.5">
                  Open BytLinks in <span className="font-semibold">Safari</span> and tap the
                  Share <Share className="w-3.5 h-3.5 inline -mt-0.5" /> button
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent font-body text-xs font-semibold flex items-center justify-center">
                  2
                </span>
                <span className="font-body text-sm text-brand-text pt-0.5">
                  Scroll down and tap <span className="font-semibold">"Add to Home Screen"</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent font-body text-xs font-semibold flex items-center justify-center">
                  3
                </span>
                <span className="font-body text-sm text-brand-text pt-0.5">
                  Tap <span className="font-semibold">"Add"</span>
                </span>
              </li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}
