import { createContext, useContext } from 'react';

interface AnalyticsAnim {
  countUpKey: number;
  refreshing: boolean;
}

const AnalyticsAnimContext = createContext<AnalyticsAnim>({
  countUpKey: 0,
  refreshing: false,
});

export const AnalyticsAnimProvider = AnalyticsAnimContext.Provider;

export function useCountUpKey() {
  return useContext(AnalyticsAnimContext).countUpKey;
}

export function useRefreshing() {
  return useContext(AnalyticsAnimContext).refreshing;
}
