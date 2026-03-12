import { useEffect, useState, useCallback, useRef } from 'react';

interface OverviewData {
  total_users: number;
  new_users_30d: number;
  prev_users_30d: number;
  total_pages: number;
  published_pages: number;
  total_links: number;
  total_blocks: number;
  total_views: number;
  recent_views_30d: number;
  prev_views_30d: number;
  total_clicks: number;
  recent_clicks_30d: number;
  prev_clicks_30d: number;
  total_newsletter_signups: number;
  pending_verifications: number;
  signup_to_publish_rate: number;
  platform_ctr: number;
}

interface GrowthDay { day: string; count: number; cumulative: number }
interface ViewDay { day: string; views: number; clicks: number }
interface TopPage { username: string; display_name: string | null; email: string; views: number }
interface ReferrerItem { source: string; count: number }
interface CountryItem { country: string; count: number }
interface DeviceItem { name: string; count: number }
interface DevicesData {
  device_types: DeviceItem[];
  browsers: DeviceItem[];
  operating_systems: DeviceItem[];
}
interface ContentStats {
  block_types: { block_type: string; count: number }[];
  avg_links_per_page: number;
  avg_blocks_per_page: number;
  plan_distribution: { plan: string; count: number }[];
}
interface ActivityFeed {
  recent_signups: { id: string; email: string; created_at: number; username: string | null }[];
  active_pages: { username: string; display_name: string | null; views: number }[];
}
interface VerificationRequest {
  id: string;
  user_id: string;
  reason: string;
  created_at: number;
  status: string;
  email: string;
  username: string | null;
  display_name: string | null;
}
interface UserRow {
  id: string;
  email: string;
  plan: string;
  verified: number;
  created_at: number;
  username: string | null;
  display_name: string | null;
  is_published: number;
  link_count: number;
  block_count: number;
  view_count: number;
}
interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface FunnelData {
  signed_up: number;
  created_page: number;
  published: number;
  added_links: number;
  added_blocks: number;
  got_views: number;
  got_clicks: number;
}

interface EngagementData {
  active_pages: number;
  total_interactions: number;
  interaction_breakdown: { event_type: string; count: number }[];
  stale_pages: number;
  recently_updated: number;
}

interface HeatmapCell { dow: number; hour: number; count: number }

interface GrowthRatePeriod {
  current: number;
  previous: number;
  change_pct: number;
}

interface GrowthRatesData {
  weekly: { users: GrowthRatePeriod; views: GrowthRatePeriod; clicks: GrowthRatePeriod };
  monthly: { users: GrowthRatePeriod; views: GrowthRatePeriod; clicks: GrowthRatePeriod };
}

export interface AdminOverviewTab {
  overview: OverviewData | null;
  userGrowth: GrowthDay[];
  platformViews: ViewDay[];
  activityFeed: ActivityFeed | null;
  growthRates: GrowthRatesData | null;
}

export interface AdminEngagementTab {
  funnel: FunnelData | null;
  engagement: EngagementData | null;
  heatmap: HeatmapCell[];
  topPages: TopPage[];
}

export interface AdminAudienceTab {
  referrers: ReferrerItem[];
  countries: CountryItem[];
  devices: DevicesData | null;
}

export interface AdminUsersTab {
  contentStats: ContentStats | null;
}

export interface AdminQueueTab {
  verificationQueue: VerificationRequest[];
}

export type { UserRow, Pagination, VerificationRequest, GrowthDay, ViewDay, TopPage, ReferrerItem, CountryItem, DevicesData, ContentStats, ActivityFeed, FunnelData, EngagementData, HeatmapCell, GrowthRatesData, OverviewData };

const adminFetch = (path: string) =>
  fetch(`/api/bytadmin${path}`, { credentials: 'include' }).then((r) => r.json());

export type AdminTab = 'overview' | 'engagement' | 'audience' | 'users' | 'queue';

export function useAdminAnalytics(days: number = 30) {
  const [overviewTab, setOverviewTab] = useState<AdminOverviewTab>({
    overview: null, userGrowth: [], platformViews: [], activityFeed: null, growthRates: null,
  });
  const [engagementTab, setEngagementTab] = useState<AdminEngagementTab>({
    funnel: null, engagement: null, heatmap: [], topPages: [],
  });
  const [audienceTab, setAudienceTab] = useState<AdminAudienceTab>({
    referrers: [], countries: [], devices: null,
  });
  const [usersTab, setUsersTab] = useState<AdminUsersTab>({ contentStats: null });
  const [queueTab, setQueueTab] = useState<AdminQueueTab>({ verificationQueue: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which tabs have been fetched for the current days value
  const fetchedTabs = useRef<Set<string>>(new Set());

  // Reset fetched tabs when days changes
  useEffect(() => {
    fetchedTabs.current.clear();
  }, [days]);

  const fetchOverview = useCallback(async (force = false) => {
    if (!force && fetchedTabs.current.has('overview')) return;
    setLoading(true);
    setError(null);
    try {
      const [overview, growth, views, feed, rates] = await Promise.all([
        adminFetch('/overview'),
        adminFetch(`/user-growth?days=${days}`),
        adminFetch(`/platform-views?days=${days}`),
        adminFetch('/activity-feed'),
        adminFetch('/growth-rates'),
      ]);
      setOverviewTab({
        overview: overview.success ? overview.data : null,
        userGrowth: growth.success ? growth.data : [],
        platformViews: views.success ? views.data : [],
        activityFeed: feed.success ? feed.data : null,
        growthRates: rates.success ? rates.data : null,
      });
      fetchedTabs.current.add('overview');
    } catch {
      setError('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchEngagement = useCallback(async (force = false) => {
    if (!force && fetchedTabs.current.has('engagement')) return;
    setLoading(true);
    setError(null);
    try {
      const [funnel, engagement, heatmap, pages] = await Promise.all([
        adminFetch('/activation-funnel'),
        adminFetch(`/engagement-metrics?days=${days}`),
        adminFetch(`/hourly-heatmap?days=${days}`),
        adminFetch(`/top-pages?limit=20&days=${days}`),
      ]);
      setEngagementTab({
        funnel: funnel.success ? funnel.data : null,
        engagement: engagement.success ? engagement.data : null,
        heatmap: heatmap.success ? heatmap.data : [],
        topPages: pages.success ? pages.data : [],
      });
      fetchedTabs.current.add('engagement');
    } catch {
      setError('Failed to load engagement data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchAudience = useCallback(async (force = false) => {
    if (!force && fetchedTabs.current.has('audience')) return;
    setLoading(true);
    setError(null);
    try {
      const [referrers, countries, devices] = await Promise.all([
        adminFetch(`/referrers?days=${days}`),
        adminFetch(`/countries?days=${days}`),
        adminFetch(`/devices?days=${days}`),
      ]);
      setAudienceTab({
        referrers: referrers.success ? referrers.data : [],
        countries: countries.success ? countries.data : [],
        devices: devices.success ? devices.data : null,
      });
      fetchedTabs.current.add('audience');
    } catch {
      setError('Failed to load audience data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchUsers = useCallback(async (force = false) => {
    if (!force && fetchedTabs.current.has('users')) return;
    setLoading(true);
    setError(null);
    try {
      const content = await adminFetch('/content-stats');
      setUsersTab({ contentStats: content.success ? content.data : null });
      fetchedTabs.current.add('users');
    } catch {
      setError('Failed to load users data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async (force = false) => {
    if (!force && fetchedTabs.current.has('queue')) return;
    setLoading(true);
    setError(null);
    try {
      const queue = await adminFetch('/verification-queue');
      setQueueTab({ verificationQueue: queue.success ? queue.data : [] });
      fetchedTabs.current.add('queue');
    } catch {
      setError('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTab = useCallback(async (tab: AdminTab, force = false) => {
    switch (tab) {
      case 'overview': return fetchOverview(force);
      case 'engagement': return fetchEngagement(force);
      case 'audience': return fetchAudience(force);
      case 'users': return fetchUsers(force);
      case 'queue': return fetchQueue(force);
    }
  }, [fetchOverview, fetchEngagement, fetchAudience, fetchUsers, fetchQueue]);

  const refetchCurrentTab = useCallback(async (tab: AdminTab) => {
    fetchedTabs.current.delete(tab);
    await fetchTab(tab, true);
  }, [fetchTab]);

  return {
    overviewTab,
    engagementTab,
    audienceTab,
    usersTab,
    queueTab,
    loading,
    error,
    fetchTab,
    refetchCurrentTab,
  };
}

export function useAdminUsers(page: number, search: string, sort: string, order: string) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/users?page=${page}&limit=50&search=${encodeURIComponent(search)}&sort=${sort}&order=${order}`);
      if (res.success) {
        setUsers(res.data);
        setPagination(res.pagination);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [page, search, sort, order]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, pagination, loading, refetch: fetchUsers };
}
