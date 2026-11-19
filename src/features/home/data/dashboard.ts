export type DashboardUser = { name: string; avatar?: number; hasUnreadNotifications: boolean };
export type MetricKey = 'steps' | 'heart-rate' | 'water' | 'sleep';
export type MetricSummary = {
  key: MetricKey;
  current?: number;
  goal?: number;
  chart: number[];
  route: '/steps' | '/heart-rate' | '/water' | '/sleep';
};

export const dashboardUser: DashboardUser = {
  name: 'Alex',
  avatar: require('../../../../assets/images/alex-avatar.png'),
  hasUnreadNotifications: true,
};

export const dashboardMetrics: MetricSummary[] = [
  { key: 'steps', chart: [], route: '/steps' },
  { key: 'heart-rate', chart: [], route: '/heart-rate' },
  { key: 'water', chart: [], route: '/water' },
  { key: 'sleep', chart: [], route: '/sleep' },
];
