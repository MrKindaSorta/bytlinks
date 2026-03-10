import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePage } from '../hooks/usePage';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Settings, ExternalLink, LayoutDashboard } from 'lucide-react';
import logoSrc from '../logo/BytLinks.png';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { MyBytLink } from '../components/editor/MyBytLink';

type DashboardTab = 'mybytlink' | 'analytics' | 'settings';

const TAB_ICONS = {
  mybytlink: LayoutDashboard,
  analytics: BarChart3,
  settings: Settings,
} as const;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('mybytlink');
  const { user, logout } = useAuth();
  const { page } = usePage();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const tabs: { key: DashboardTab; label: string; mobileLabel?: string }[] = [
    { key: 'mybytlink', label: 'My BytLink', mobileLabel: 'My Page' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="h-screen bg-brand-bg overflow-hidden">
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
          <main className="overflow-y-auto pb-20 lg:pb-0">
            <MyBytLink />
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

        {/* Bottom nav — mobile only */}
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
    </div>
  );
}
