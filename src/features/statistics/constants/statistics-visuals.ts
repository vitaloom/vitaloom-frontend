// Statistics-specific roles from the approved mockups. Shared typography and
// control geometry still come from the application theme.
export const statisticsVisuals = {
  light: {
    background: '#FAFAFD', text: '#131827', secondary: '#465367', selector: '#EFF0F5',
    pink: ['#B52154', '#CD295F'], mint: ['#087A61', '#137760'], onSelection: '#FFFFFF',
    heartRate: ['#FFF4F8', '#FCE7F0', '#DE3974'],
    steps: ['#F1FCF8', '#E4F8F1', '#168365'],
    water: ['#F1F8FE', '#E5F2FD', '#0078A4'],
    sleep: ['#F7F2FD', '#F0E9FB', '#8150C8'],
  },
  dark: {
    background: '#16172A', text: '#FAF8FF', secondary: '#D5CFE1', selector: '#29263E',
    pink: ['#BC2459', '#CC295E'], mint: ['#BC2459', '#CC295E'], onSelection: '#FFFFFF',
    heartRate: ['#482A47', '#32233C', '#FF6DA3'],
    steps: ['#1D3A42', '#152D36', '#5EE6B6'],
    water: ['#233652', '#192843', '#5AD4FB'],
    sleep: ['#352B53', '#272243', '#BB98FF'],
  },
} as const;

export type StatisticsVisuals = typeof statisticsVisuals[keyof typeof statisticsVisuals];
