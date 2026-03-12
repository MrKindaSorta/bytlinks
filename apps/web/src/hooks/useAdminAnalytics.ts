import { useEffect, useState, useCallback } from 'react';

interface OverviewData {
  total_users: number;
  new_users_30d: number;
  total_pages: number;
  published_pages: number;
  total_links: number;
  total_blocks: number;
  total_views: number;
  recent_views_30d: number;
  total_clicks: number;
  total_newsletter_signups: number;
  pending_verifications: number;
}

interface GrowthDay { day: string; count: number }
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
  full_name: string;
  reason: string;
  links: string;
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

export interface AdminData {
  overview: OverviewData | null;
  userGrowth: GrowthDay[];
  platformViews: ViewDay[];
  topPages: TopPage[];
  referrers: ReferrerItem[];
  countries: CountryItem[];
  devices: DevicesData | null;
  contentStats: ContentStats | null;
  activityFeed: ActivityFeed | null;
  verificationQueue: VerificationRequest[];
}

export type { UserRow, Pagination, VerificationRequest };

const adminFetch = (path: string) =>
  fetch(`/api/bytadmin${path}`, { credentials: 'include' }).then((r) => r.json());

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminData>({
    overview: null,
    userGrowth: [],
    platformViews: [],
    topPages: [],
    referrers: [],
    countries: [],
    devices: null,
    contentStats: null,
    activityFeed: null,
    verificationQueue: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [overview, growth, views, pages, referrers, countries, devices, content, feed, queue] = await Promise.all([
        adminFetch('/overview'),
        adminFetch('/user-growth?days=90'),
        adminFetch('/platform-views'),
        adminFetch('/top-pages?limit=20'),
        adminFetch('/referrers'),
        adminFetch('/countries'),
        adminFetch('/devices'),
        adminFetch('/content-stats'),
        adminFetch('/activity-feed'),
        adminFetch('/verification-queue'),
      ]);

      setData({
        overview: overview.success ? overview.data : null,
        userGrowth: growth.success ? growth.data : [],
        platformViews: views.success ? views.data : [],
        topPages: pages.success ? pages.data : [],
        referrers: referrers.success ? referrers.data : [],
        countries: countries.success ? countries.data : [],
        devices: devices.success ? devices.data : null,
        contentStats: content.success ? content.data : null,
        activityFeed: feed.success ? feed.data : null,
        verificationQueue: queue.success ? queue.data : [],
      });
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, refetch: fetchAll };
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
