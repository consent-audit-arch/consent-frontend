import type { DashboardMetrics, TimeSeriesResponse } from '../types';
import { dashboardClient } from './client';

export const getDashboardMetrics = () =>
  dashboardClient.get<DashboardMetrics>('/metrics');

export const getDashboardTimeSeries = (from: string, to: string) =>
  dashboardClient.get<TimeSeriesResponse>('/metrics/timeseries', {
    params: { from, to },
  });
