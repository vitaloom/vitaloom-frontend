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
  { key: 'water', current: 1.5, goal: 2, chart: [32, 18, 38, 20, 44, 23, 36, 50, 22, 46, 24, 38], route: '/water' },
  { key: 'sleep', current: 7.5, goal: 8, chart: [42, 22, 38, 45, 30, 35, 49, 53, 19, 42], route: '/sleep' },
];
