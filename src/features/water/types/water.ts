import type { useTheme } from '@/hooks/use-theme';

export type Intake = { id: number; amount: number; time: string };
export type AmountChoice = 100 | 250 | 500 | 'custom';
export type Theme = ReturnType<typeof useTheme>;
