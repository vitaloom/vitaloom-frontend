export type DashboardUser = { name: string; avatar?: number; hasUnreadNotifications: boolean };
export type MetricKey = 'steps' | 'heart-rate' | 'water' | 'sleep';
export type MetricSummary = {
  key: MetricKey;
  title: string;
  value: string;
  unit?: string;
  secondary: string;
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
  { key: 'steps', title: 'Steps', value: '—', secondary: 'Recorded today', chart: [], route: '/steps' },
  { key: 'heart-rate', title: 'Heart Rate', value: '—', unit: 'bpm', secondary: 'Latest recorded', chart: [], route: '/heart-rate' },
  { key: 'water', title: 'Water', value: '1.5 L', secondary: '/ 2.0 L', current: 1.5, goal: 2, chart: [32, 18, 38, 20, 44, 23, 36, 50, 22, 46, 24, 38], route: '/water' },
  { key: 'sleep', title: 'Sleep', value: '7h 30m', secondary: '/ 8 hours', current: 7.5, goal: 8, chart: [42, 22, 38, 45, 30, 35, 49, 53, 19, 42], route: '/sleep' },
];
