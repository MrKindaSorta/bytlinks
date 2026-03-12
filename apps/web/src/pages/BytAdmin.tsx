import { RefreshCw, LogOut } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import { AdminLogin } from '../components/admin/AdminLogin';
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

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { data, loading, refetch } = useAdminAnalytics();

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-lg font-800 tracking-tight text-brand-text">
            BytLinks Admin Console
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border font-body text-xs font-medium text-brand-text-muted hover:bg-brand-surface-alt disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            {data.overview && <AdminOverview overview={data.overview} />}

            {/* Charts — 2 column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminUserGrowthChart data={data.userGrowth} />
              <AdminViewsChart data={data.platformViews} />
            </div>

            {/* Top Pages + Content Stats — 2 column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminTopPages pages={data.topPages} />
              {data.contentStats && <AdminContentStats stats={data.contentStats} />}
            </div>

            {/* Referrers + Countries + Devices — 3 column */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AdminReferrers referrers={data.referrers} />
              <AdminCountries countries={data.countries} />
              {data.devices && <AdminDevices devices={data.devices} />}
            </div>

            {/* User Table — full width */}
            <AdminUserTable />

            {/* Activity Feed + Verification Queue — 2 column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.activityFeed && <AdminActivityFeed feed={data.activityFeed} />}
              <AdminVerificationQueue queue={data.verificationQueue} onRefresh={refetch} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
