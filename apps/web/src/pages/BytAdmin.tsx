import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import type { AdminTab } from '../hooks/useAdminAnalytics';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminTabBar } from '../components/admin/AdminTabBar';
import { AdminDateRangePicker } from '../components/admin/AdminDateRangePicker';
import { AdminExportButton } from '../components/admin/AdminExportButton';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminUserGrowthChart } from '../components/admin/AdminUserGrowthChart';
import { AdminViewsChart } from '../components/admin/AdminViewsChart';
import { AdminTopPages } from '../components/admin/AdminTopPages';
import { AdminContentStats } from '../components/admin/AdminContentStats';
import { AdminReferrers } from '../components/admin/AdminReferrers';
import { AdminCountries } from '../components/admin/AdminCountries';
import { AdminDevices } from '../components/admin/AdminDevices';
import { AdminUserTable } from '../components/admin/AdminUserTable';
import { AdminActivityFeed } from '../components/admin/AdminActivityFeed';
import { AdminVerificationQueue } from '../components/admin/AdminVerificationQueue';
import { AdminActivationFunnel } from '../components/admin/AdminActivationFunnel';
import { AdminHourlyHeatmap } from '../components/admin/AdminHourlyHeatmap';
import { AdminEngagementMetrics } from '../components/admin/AdminEngagementMetrics';

export default function BytAdmin() {
  const { isAuthenticated, isLoading: authLoading, error, login, logout } = useAdminAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} error={error} />;
  }

  return <AdminDashboard onLogout={logout} />;
}

type RefreshState = 'idle' | 'loading' | 'done';

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const hash = window.location.hash.replace('#', '') as AdminTab;
    return ['overview', 'engagement', 'audience', 'users', 'queue'].includes(hash) ? hash : 'overview';
  });
  const [days, setDays] = useState(30);
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');

  const {
    overviewTab, engagementTab, audienceTab, usersTab, queueTab,
    loading, error, fetchTab, refetchCurrentTab,
  } = useAdminAnalytics(days);

  // Fetch tab data on tab change
  useEffect(() => {
    window.location.hash = activeTab;
    fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  // Refetch when days changes
  useEffect(() => {
    fetchTab(activeTab, true);
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    setRefreshState('loading');
    await refetchCurrentTab(activeTab);
    setRefreshState('done');
    setTimeout(() => setRefreshState('idle'), 2000);
  }, [activeTab, refetchCurrentTab]);

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="font-display text-lg font-800 tracking-tight text-brand-text">
            BytLinks Admin Console
          </h1>
          <div className="flex items-center gap-2">
            <AdminDateRangePicker value={days} onChange={setDays} />
            <AdminExportButton />
            <button
              onClick={handleRefresh}
              disabled={refreshState === 'loading'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border font-body text-xs font-medium text-brand-text-muted hover:bg-brand-surface-alt disabled:opacity-50"
            >
              {refreshState === 'done' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Updated
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshState === 'loading' ? 'animate-spin' : ''}`} />
                  Refresh
                </>
              )}
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border font-body text-xs font-medium text-brand-text-muted hover:bg-brand-surface-alt"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="font-body text-xs text-rose-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <AdminTabBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab content */}
        {loading && !overviewTab.overview && !engagementTab.funnel && !audienceTab.devices ? (
          <TabSkeleton />
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {overviewTab.overview && <AdminOverview overview={overviewTab.overview} />}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AdminUserGrowthChart data={overviewTab.userGrowth} days={days} />
                  <AdminViewsChart data={overviewTab.platformViews} days={days} />
                </div>
                {overviewTab.activityFeed && <AdminActivityFeed feed={overviewTab.activityFeed} />}
              </div>
            )}

            {activeTab === 'engagement' && (
              <div className="space-y-6">
                {engagementTab.funnel && (
                  <AdminActivationFunnel data={engagementTab.funnel} />
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {engagementTab.engagement && (
                    <AdminEngagementMetrics
                      data={engagementTab.engagement}
                      totalViews={overviewTab.overview?.recent_views_30d ?? 0}
                    />
                  )}
                  <AdminHourlyHeatmap data={engagementTab.heatmap} />
                </div>
                <AdminTopPages pages={engagementTab.topPages} />
              </div>
            )}

            {activeTab === 'audience' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AdminReferrers referrers={audienceTab.referrers} />
                  <AdminCountries countries={audienceTab.countries} />
                  {audienceTab.devices && <AdminDevices devices={audienceTab.devices} />}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <AdminUserTable />
                {usersTab.contentStats && <AdminContentStats stats={usersTab.contentStats} />}
              </div>
            )}

            {activeTab === 'queue' && (
              <AdminVerificationQueue
                queue={queueTab.verificationQueue}
                onRefresh={() => refetchCurrentTab('queue')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-border bg-brand-surface p-4 animate-pulse">
            <div className="h-3 w-16 bg-brand-surface-alt rounded mb-3" />
            <div className="h-6 w-20 bg-brand-surface-alt rounded mb-2" />
            <div className="h-2 w-12 bg-brand-surface-alt rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-border bg-brand-surface p-5 h-[280px] animate-pulse">
            <div className="h-4 w-32 bg-brand-surface-alt rounded mb-4" />
            <div className="h-full bg-brand-surface-alt/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
