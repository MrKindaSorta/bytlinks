import { StatCards } from './StatCards';
import { ViewsChart } from './ViewsChart';
import { ReferrerList } from './ReferrerList';
import { CountryList } from './CountryList';
import { DeviceBreakdown } from './DeviceBreakdown';
import { LinkPerformanceTable } from './LinkPerformanceTable';
import { RealtimePulse } from './RealtimePulse';
import type { AnalyticsData } from '../../hooks/useAnalytics';

interface Props {
  data: AnalyticsData;
}

export function PageAnalyticsTab({ data }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
      {/* Realtime — full width */}
      {data.realtime && (
        <div className="col-span-full">
          <RealtimePulse data={data.realtime} />
        </div>
      )}

      {/* Stat cards — full width (internal 3-col grid) */}
      <div className="col-span-full">
        <StatCards overview={data.overview!} />
      </div>

      {/* Chart — spans 2 cols at 2xl, full width at xl */}
      <div className="xl:col-span-2 2xl:col-span-2">
        <ViewsChart daily={data.overview!.daily} />
      </div>

      {/* Devices — fills remaining col at 2xl, full at xl */}
      <div className="xl:col-span-2 2xl:col-span-1">
        <DeviceBreakdown devices={data.devices} />
      </div>

      {/* Referrers + Countries — 1 col each, sit side by side */}
      <ReferrerList referrers={data.referrers} />
      <CountryList countries={data.countries} />

      {/* Link performance */}
      <LinkPerformanceTable links={data.linkPerformance} />
    </div>
  );
}
