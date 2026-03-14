import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePage } from '../hooks/usePage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Settings, ExternalLink, LayoutDashboard, Layers, CreditCard, Crown, X, Users } from 'lucide-react';
import { AffiliationsPanel } from '../components/affiliations/AffiliationsPanel';
import { PageHead } from '../components/PageHead';
import logoSrc from '../logo/BytLinks.png';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { MyBytLink } from '../components/editor/MyBytLink';
import { TemplatePicker } from '../components/templates/TemplatePicker';
import { ManageSection } from '../components/manage/ManageSection';
import { BusinessCardHub } from '../components/businesscard/BusinessCardHub';
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist';
import type { ProfileTemplate, Theme } from '@bytlinks/shared';

type DashboardTab = 'mybytlink' | 'card' | 'analytics' | 'settings' | 'manage' | 'affiliations';

const TAB_ICONS = {
  mybytlink: LayoutDashboard,
  card: CreditCard,
  analytics: BarChart3,
  settings: Settings,
  manage: Layers,
  affiliations: Users,
} as const;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('mybytlink');
  const { user, logout, refreshUser } = useAuth();
  const { page, updatePage } = usePage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showTemplates = searchParams.get('showTemplates') === 'true';
  const [upgradeBanner, setUpgradeBanner] = useState(false);
  const upgradeHandled = useRef(false);

  // Handle ?tab= search param to navigate to a specific tab on load
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabs.some((t) => t.key === tab)) {
      setActiveTab(tab as DashboardTab);
      // Don't clear tab param — AffiliationsPanel reads joinToken from the same searchParams
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect post-Stripe redirect and refresh auth to pick up Pro status
  useEffect(() => {
    if (upgradeHandled.current) return;
    const upgraded = searchParams.get('upgraded');
    if (upgraded === '1') {
      upgradeHandled.current = true;
      setSearchParams({}, { replace: true });
      refreshUser().then((u) => {
        if (u?.plan === 'pro') {
          setUpgradeBanner(true);
        }
      });
    } else if (upgraded === '0') {
      upgradeHandled.current = true;
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshUser]);

  function handleTemplateApply(template: ProfileTemplate) {
    if (!page) return;
    const merged: Theme = { ...page.theme, ...template.theme } as Theme;
    updatePage({ theme: merged }).catch(() => {});
    setSearchParams({}, { replace: true });
  }

  function handleTemplateSkip() {
    setSearchParams({}, { replace: true });
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const tabs: { key: DashboardTab; label: string; mobileLabel?: string }[] = [
    { key: 'mybytlink', label: 'My BytLink', mobileLabel: 'My Page' },
    { key: 'card', label: 'Business Card', mobileLabel: 'Card' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
    { key: 'manage', label: 'Manage' },
    { key: 'affiliations', label: 'Affiliations', mobileLabel: 'Team' },
  ];

  return (
    <div className="h-screen bg-brand-bg overflow-hidden">
      <PageHead title="Dashboard" noIndex />

      {/* Pro upgrade success banner */}
      {upgradeBanner && (
        <div className="fixed top-0 left-0 right-0 z-[70] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
          <Crown className="w-5 h-5 shrink-0" />
          <span className="font-body text-sm font-semibold">
            Welcome to Pro! All premium features are now unlocked.
          </span>
          <button
            onClick={() => setUpgradeBanner(false)}
            className="ml-2 p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showTemplates && (
        <TemplatePicker
          fullscreen
          onApply={handleTemplateApply}
          onSkip={handleTemplateSkip}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] h-full">
        {/* Sidebar — fixed, never scrolls */}
        <aside className="hidden lg:flex flex-col border-r border-brand-border bg-brand-surface px-4 py-6 h-full overflow-y-auto">
          <a href="/" className="block mb-8 px-2">
            <img src={logoSrc} alt="BytLinks" className="h-[68px] object-contain" />
          </a>

          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = TAB_ICONS[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 font-body text-sm font-medium text-left px-3 py-2 rounded-lg
                    transition-colors duration-fast
                    ${activeTab === tab.key
                      ? 'bg-brand-surface-alt text-brand-text'
                      : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface-alt'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Public page link */}
          {page?.username && (
            <a
              href={`/${page.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-body text-xs font-medium text-brand-accent
                         px-3 py-2 mt-4 rounded-lg hover:bg-brand-surface-alt
                         transition-colors duration-fast"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              bytlinks.com/{page.username}
            </a>
          )}

          <div className="mt-auto pt-6 border-t border-brand-border">
            <p className="font-body text-xs text-brand-text-muted px-2 mb-2">
              {user?.email}
            </p>
            <p className="font-body text-xs text-brand-text-muted px-2 mb-3">
              {user?.plan === 'free' ? 'Free plan' : 'Pro plan'}
            </p>
            <button
              onClick={handleLogout}
              className="font-body text-xs font-medium text-brand-text-secondary px-2
                         hover:text-brand-text transition-colors duration-fast"
            >
              Log out
            </button>
          </div>
        </aside>

        {/* Main content area — scrolls independently */}
        {activeTab === 'mybytlink' ? (
          <main className="overflow-y-auto min-w-0 pb-20 lg:pb-0"
                style={{ overflowX: 'clip', contain: 'inline-size' }}>
            <div className="px-4 pt-4 lg:px-6 lg:pt-6">
              <OnboardingChecklist onNavigate={(tab) => setActiveTab(tab as DashboardTab)} />
            </div>
            <MyBytLink />
          </main>
        ) : activeTab === 'card' ? (
          <main className="flex flex-col pb-14 lg:pb-0">
            <BusinessCardHub />
          </main>
        ) : activeTab === 'manage' ? (
          <main className="overflow-y-auto pb-20 lg:pb-0">
            <ManageSection />
          </main>
        ) : activeTab === 'affiliations' ? (
          <main className="overflow-y-auto pb-20 lg:pb-0">
            <AffiliationsPanel />
          </main>
        ) : (
          <main className="px-6 py-8 lg:px-10 lg:py-10 pb-20 lg:pb-10 overflow-y-auto">
            <div className={activeTab === 'analytics' ? '' : 'max-w-3xl'}>
              <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
                {activeTab === 'analytics' && 'Analytics'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              <p className="font-body text-sm text-brand-text-secondary mb-8">
                {activeTab === 'analytics' && 'See how your page is performing.'}
                {activeTab === 'settings' && 'Manage your account and page settings.'}
              </p>

              {activeTab === 'analytics' && <AnalyticsDashboard />}

              {activeTab === 'settings' && <SettingsPanel />}
            </div>
          </main>
        )}

      </div>

      {/* Bottom nav — mobile only (outside grid to avoid mobile grid interaction) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-brand-border
                      flex justify-around px-2 py-2 z-50">
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 font-body text-xs font-medium px-3 py-1.5 rounded-lg
                transition-colors duration-fast
                ${activeTab === tab.key
                  ? 'text-brand-accent'
                  : 'text-brand-text-muted'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.mobileLabel || tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
