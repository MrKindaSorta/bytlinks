import { useEffect, useState, useCallback } from 'react';

interface DailyData {
  day: string;
  views: number;
  clicks: number;
}

interface OverviewData {
  total_views: number;
  total_clicks: number;
  daily: DailyData[];
  views_trend: number;
  clicks_trend: number;
}

interface ReferrerData {
  source: string;
  count: number;
}

interface CountryData {
  country: string;
  count: number;
}

interface DeviceData {
  device_types: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  operating_systems: { name: string; count: number }[];
}

interface LinkPerformanceData {
  id: string;
  title: string;
  url: string;
  clicks: number;
  ctr: number;
}

interface RealtimeData {
  active_views: number;
  active_clicks: number;
}

export interface BlockPerformanceData {
  block_id: string;
  block_type: string;
  title: string | null;
  event_type: string;
  metric_label: string;
  count: number;
  poll: {
    question: string;
    options: { text: string; votes: number }[];
    closed: boolean;
    total_votes: number;
  } | null;
  newsletter_count: number | null;
}

export interface BlockPerformanceSummary {
  total_interactions: number;
  top_block: { block_id: string; title: string | null; block_type: string; count: number } | null;
}

export interface AnalyticsData {
  overview: OverviewData | null;
  referrers: ReferrerData[];
  countries: CountryData[];
  devices: DeviceData | null;
  linkPerformance: LinkPerformanceData[];
  blockPerformance: BlockPerformanceData[];
  blockSummary: BlockPerformanceSummary | null;
  realtime: RealtimeData | null;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    overview: null,
    referrers: [],
    countries: [],
    devices: null,
    linkPerformance: [],
    blockPerformance: [],
    blockSummary: null,
    realtime: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // Send browser timezone offset so the backend groups daily data by local day
      const tz = new Date().getTimezoneOffset() * 60;
      const [overview, referrers, countries, devices, linkPerf, blockPerf, realtime] = await Promise.all([
        fetch(`/api/analytics/overview?tz=${tz}`).then((r) => r.json()),
        fetch('/api/analytics/referrers').then((r) => r.json()),
        fetch('/api/analytics/countries').then((r) => r.json()),
        fetch('/api/analytics/devices').then((r) => r.json()),
        fetch('/api/analytics/link-performance').then((r) => r.json()),
        fetch('/api/analytics/block-performance').then((r) => r.json()),
        fetch('/api/analytics/realtime').then((r) => r.json()),
      ]);

      setData({
        overview: overview.success ? overview.data : null,
        referrers: referrers.success ? referrers.data : [],
        countries: countries.success ? countries.data : [],
        devices: devices.success ? devices.data : null,
        linkPerformance: linkPerf.success ? linkPerf.data : [],
        blockPerformance: blockPerf.success ? blockPerf.data : [],
        blockSummary: blockPerf.success && blockPerf.summary ? blockPerf.summary : null,
        realtime: realtime.success ? realtime.data : null,
      });
    } catch {
      // Silently fail — data stays as defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, refetch: fetchAll };
}
