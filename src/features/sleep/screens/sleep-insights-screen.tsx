import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { SleepInsightCard } from '../components/sleep-insight-card';
import { SleepTimeZoneChoices } from '../components/sleep-time-zone-choices';
import { SleepNotice, SleepPage, SleepSegments } from '../components/sleep-ui';
import { SleepWeekPicker } from '../components/sleep-week-picker';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { InsightCategory, SleepType } from '../types/sleep';
import { shiftDay, startOfWeek } from '../utils/sleep-date';
import { distinctInsights } from '../utils/sleep-insights';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'patterns', label: 'Patterns' },
  { value: 'feelings', label: 'Feelings' },
  { value: 'discoveries', label: 'Discoveries' },
] as const;
const sleepTypes = [{ value: 'main', label: 'Main Sleep' }, { value: 'nap', label: 'Nap' }] as const;

export default function SleepInsightsScreen() {
  const repository = useSleepRepository();
  const currentWeek = startOfWeek(repository.getContext().today);
  const [week, setWeek] = useState(() => shiftDay(currentWeek, -7));
  const [category, setCategory] = useState<InsightCategory | 'all'>('all');
  const [timeZone, setTimeZone] = useState('');
  const [sleepType, setSleepType] = useState<SleepType>('main');
  const query = { week, timeZone: timeZone || undefined, sleepType };
  const { state, reload } = useSleepRead(() => repository.getInsights(query), `insights:${week}:${timeZone}:${sleepType}`);
  const list = state.kind === 'ready' ? state.data : null;
  const candidates = list?.items.filter((item) => category === 'all' || item.category === category) ?? [];
  const items = distinctInsights(candidates);
  const changeWeek = (next: string) => { setTimeZone(''); setWeek(next); };

  return <SleepPage title="Sleep Insights" subtitle="Explore patterns in recorded sleep and feelings." hero>
    <SleepSegments options={filters} value={category} onChange={setCategory} />
    <SleepWeekPicker week={week} currentWeek={currentWeek} onChange={changeWeek} />
    {category === 'feelings' ? <>
      <ThemedText variant="label">Feeling distribution by session type</ThemedText>
      <SleepSegments options={sleepTypes} value={sleepType} onChange={setSleepType} />
    </> : null}
    {(category === 'patterns' || category === 'all') && list?.status === 'ready'
      ? <SleepTimeZoneChoices options={list.timeZones} value={timeZone} onChange={setTimeZone} /> : null}
    {state.kind === 'loading' ? <SleepNotice title="Loading insights" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load insights" message={state.message} error actionLabel="Retry" onAction={reload} /> : null}
    {list?.status === 'no-data' ? <SleepNotice title="No recorded sleep for this week" message="Record a sleep session to start exploring." /> : null}
    {list?.status === 'unverified' ? <SleepNotice title="History is unverified" message="Sleep history could not be fully verified." actionLabel="Retry" onAction={reload} /> : null}
    {list?.status === 'stale' ? <SleepNotice title="Evidence changed" message="Refresh to check for current insights." actionLabel="Refresh" onAction={reload} /> : null}
    {list?.status === 'ready' && items.length === 0 ? <SleepNotice title="Not enough evidence yet"
      message={candidates.find((item) => item.status === 'insufficient')?.summary ?? 'No insights are available for this category.'} /> : null}
    {items.map((item) => <SleepInsightCard key={item.key.code} insight={item} />)}
  </SleepPage>;
}
