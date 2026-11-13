import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { SleepInsightCard } from '../components/sleep-insight-card';
import { SleepInsightsFallback } from '../components/sleep-insights-fallback';
import { SleepTimeZoneChoices } from '../components/sleep-time-zone-choices';
import { SleepNotice, SleepPage, SleepSegments } from '../components/sleep-ui';
import { SleepWeekPicker } from '../components/sleep-week-picker';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { InsightCategory, SleepType } from '../types/sleep';
import { shiftDay, startOfWeek } from '../utils/sleep-date';
import { distinctInsights, insightFallback } from '../utils/sleep-insights';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'patterns', label: 'Patterns' },
  { value: 'feelings', label: 'Feelings' },
  { value: 'discoveries', label: 'Discoveries' },
] as const;
const sleepTypes = [{ value: 'main', label: 'Main Sleep' }, { value: 'nap', label: 'Nap' }] as const;

export default function SleepInsightsScreen() {
  const repository = useSleepRepository();
  const { today } = repository.getContext();
  const [week, setWeek] = useState(() => shiftDay(startOfWeek(today), -7));
  const [category, setCategory] = useState<InsightCategory | 'all'>('all');
  const [timeZone, setTimeZone] = useState('');
  const [sleepType, setSleepType] = useState<SleepType>('main');
  const query = { week, timeZone: timeZone || undefined, sleepType };
  const queryKey = `insights:${week}:${timeZone}:${sleepType}`;
  const { state, reload } = useSleepRead(() => repository.getInsights(query), queryKey);
  const list = state.kind === 'ready' ? state.data : null;
  const candidates = list?.items.filter((item) => category === 'all' || item.category === category) ?? [];
  const items = distinctInsights(candidates);
  const fallback = list ? insightFallback(list, category) : null;
  const changeWeek = (next: string) => { setTimeZone(''); setWeek(next); };

  return <SleepPage title="Sleep Insights" subtitle={items.length ? 'Explore patterns in recorded sleep and feelings.' : undefined}
    hero={true} wellness={items.length === 0}>
    <SleepSegments options={filters} value={category} onChange={setCategory} />
    <SleepWeekPicker week={week} today={today} onChange={changeWeek} />
    {category === 'feelings' ? <>
      <ThemedText variant="label">Feeling distribution by session type</ThemedText>
      <SleepSegments options={sleepTypes} value={sleepType} onChange={setSleepType} />
    </> : null}
    {(category === 'patterns' || category === 'all') && list?.status === 'ready'
      ? <SleepTimeZoneChoices options={list.timeZones} value={timeZone} onChange={setTimeZone} /> : null}
    {state.kind === 'loading' ? <SleepNotice title="Loading insights" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load insights" message={state.message} error actionLabel="Retry" onAction={reload} /> : null}
    {list?.status === 'unverified' ? <SleepNotice title="History is unverified" message="Sleep history could not be fully verified." actionLabel="Retry" onAction={reload} /> : null}
    {list?.status === 'stale' ? <SleepNotice title="Evidence changed" message="Refresh to check for current insights." actionLabel="Refresh" onAction={reload} /> : null}
    {fallback && (list?.status === 'ready' || list?.status === 'no-data') ?
      <SleepInsightsFallback key={`${queryKey}:${category}`} state={fallback} onRetry={reload} /> : null}
    {items.map((item) => <SleepInsightCard key={item.key.code} insight={item} />)}
  </SleepPage>;
}
