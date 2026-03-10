import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePage } from '../hooks/usePage';
import { useNavigate } from 'react-router-dom';
import { Link2, Palette, BarChart3, Settings, ExternalLink, Plus, LayoutDashboard } from 'lucide-react';
import { ProfileEditor } from '../components/builder/ProfileEditor';
import logoSrc from '../logo/BytLinks.png';
import { SortableSectionList } from '../components/builder/SortableSectionList';
import { SocialPicker } from '../components/builder/SocialPicker';
import { BlockPalette } from '../components/builder/BlockPalette';
import { AppearanceEditor } from '../components/builder/AppearanceEditor';
import { PreviewFrame } from '../components/builder/PreviewFrame';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { MyBytLink } from '../components/editor/MyBytLink';

type DashboardTab = 'mybytlink' | 'links' | 'appearance' | 'analytics' | 'settings';

const TAB_ICONS = {
  mybytlink: LayoutDashboard,
  links: Link2,
  appearance: Palette,
  analytics: BarChart3,
  settings: Settings,
} as const;

function LinksTabContent() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      {/* Editor column */}
      <div className="min-w-0 space-y-5">
        <section>
          <h2 className="font-display text-base font-700 tracking-tight text-brand-text mb-3">
            Profile
          </h2>
          <ProfileEditor />
        </section>

        <section>
          <h2 className="font-display text-base font-700 tracking-tight text-brand-text mb-3">
            Social Links
          </h2>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
            <SocialPicker />
          </div>
        </section>

        <SortableSectionList />

        {/* Add Block button — popover on desktop, sheet on mobile */}
        <div className="relative">
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setPopoverOpen((v) => !v);
              } else {
                setSheetOpen(true);
              }
            }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-brand-border
                       font-body text-sm font-medium text-brand-text-secondary hover:text-brand-text hover:border-brand-text-secondary
                       transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>

          {/* Desktop popover — BlockPalette handles its own exit animation */}
          {popoverOpen && (
            <BlockPalette variant="popover" onClose={() => setPopoverOpen(false)} />
          )}
        </div>

        {/* Mobile block palette sheet */}
        {sheetOpen && (
          <BlockPalette variant="sheet" onClose={() => setSheetOpen(false)} />
        )}
      </div>

      {/* Live preview column — desktop only, 50/50 split */}
      <div className="hidden lg:block lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-140px)]">
        <PreviewFrame />
      </div>
    </div>
  );
}

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
    { key: 'links', label: 'Links & Info', mobileLabel: 'Links' },
    { key: 'appearance', label: 'Appearance', mobileLabel: 'Style' },
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
          <main className={`${activeTab === 'appearance' ? 'px-3 py-6 lg:px-4 lg:py-6' : 'px-6 py-8 lg:px-10 lg:py-10'} pb-20 lg:pb-10 overflow-y-auto`}>
            <div className={activeTab === 'appearance' ? '' : activeTab === 'links' ? '' : activeTab === 'analytics' ? '' : 'max-w-3xl'}>
              <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">
                {activeTab === 'links' && 'Links & Info'}
                {activeTab === 'appearance' && 'Appearance'}
                {activeTab === 'analytics' && 'Analytics'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              <p className={`font-body text-sm text-brand-text-secondary ${activeTab === 'links' ? 'mb-5' : 'mb-8'}`}>
                {activeTab === 'links' && 'Manage your profile, links, and about section.'}
                {activeTab === 'appearance' && 'Customize how your page looks.'}
                {activeTab === 'analytics' && 'See how your page is performing.'}
                {activeTab === 'settings' && 'Manage your account and page settings.'}
              </p>

              {/* Tab content */}
              {activeTab === 'links' && (
                <LinksTabContent />
              )}

              {activeTab === 'appearance' && <AppearanceEditor />}

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
