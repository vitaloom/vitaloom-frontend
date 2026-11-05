import Svg, { Circle, Path, Polyline } from 'react-native-svg';

export type WellnessIconName = 'home' | 'statistics' | 'profile' | 'bell' | 'chevron' | 'steps' | 'heart-rate' | 'water' | 'sleep' | 'sprout';

export function WellnessIcon({ name, color, size = 24, strokeWidth = 2 }: { name: WellnessIconName; color: string; size?: number; strokeWidth?: number }) {
  const common = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    {name === 'home' && <><Path {...common} d="M3 10.3 12 3l9 7.3V21H3z" /><Path {...common} d="M9 21v-7h6v7" /></>}
    {name === 'statistics' && <><Path {...common} d="M4 20v-6h3v6M10.5 20V9h3v11M17 20V4h3v16" /></>}
    {name === 'profile' && <><Circle {...common} cx="12" cy="7" r="4" /><Path {...common} d="M4 21c0-4.1 3.3-7 8-7s8 2.9 8 7" /></>}
    {name === 'bell' && <><Path {...common} d="M5 17h14l-2-2V9a5 5 0 0 0-10 0v6z" /><Path {...common} d="M10 20a2 2 0 0 0 4 0M12 4V2" /></>}
    {name === 'chevron' && <Polyline {...common} points="9 5 16 12 9 19" />}
    {name === 'steps' && <><Path {...common} d="M3 15c3 1 5-1 7-4l3 3 6 1c2 .4 2 4 0 5H9c-3 0-5-2-6-5Z" /><Path {...common} d="m9 11 2-5 2 2-1 3M13 9l2-3 2 2-2 4" /></>}
    {name === 'heart-rate' && <Path {...common} d="M20.5 8.5c0 5-8.5 11-8.5 11s-8.5-6-8.5-11a4.6 4.6 0 0 1 8.5-2.2 4.6 4.6 0 0 1 8.5 2.2ZM3 12h5l2-3 3 6 2-3h6" />}
    {name === 'water' && <Path {...common} d="M12 2C9.1 6.7 5 11.4 5 15a7 7 0 0 0 14 0c0-3.6-4.1-8.3-7-13ZM8 16a4 4 0 0 0 4 4" />}
    {name === 'sleep' && <Path {...common} d="M19.5 16.5A8.7 8.7 0 0 1 7.5 4.5 8.8 8.8 0 1 0 19.5 16.5Z" />}
    {name === 'sprout' && <><Path {...common} d="M12 22v-9M12 16c-5 0-8-3-8-8 5 0 8 3 8 8ZM12 13c0-5 3-8 8-8 0 5-3 8-8 8Z" /></>}
  </Svg>;
}
