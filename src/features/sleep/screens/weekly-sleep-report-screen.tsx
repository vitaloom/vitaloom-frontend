import { useState } from 'react';
import { SleepNotice, SleepPage } from '../components/sleep-ui';
import { SleepTimeZoneChoices } from '../components/sleep-time-zone-choices';
import { SleepWeekPicker } from '../components/sleep-week-picker';
import { SleepWeeklyContent } from '../components/sleep-weekly-content';
import { useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import { startOfWeek } from '../utils/sleep-date';

export default function WeeklySleepReportScreen() {
  const repository = useSleepRepository();
  const { today } = repository.getContext();
  const [week, setWeek] = useState(() => startOfWeek(today));
  const [timeZone, setTimeZone] = useState('');
  const query = { week, timeZone: timeZone || undefined };
  const { state, reload } = useSleepRead(() => repository.getWeekly(query), `weekly:${week}:${timeZone}`);

  return <SleepPage title="Weekly Sleep Report" hero demo>
    <SleepWeekPicker week={week} today={today} onChange={(next) => { setTimeZone(''); setWeek(next); }} />
    {state.kind === 'loading' ? <SleepNotice title="Loading weekly sleep" loading /> : null}
    {state.kind === 'error' ? <SleepNotice title="Could not load weekly sleep" message={state.message}
      error actionLabel="Retry" onAction={reload} /> : null}
    {state.kind === 'ready' ? <>
      <SleepWeeklyContent report={state.data} query={query} reload={reload} />
      <SleepTimeZoneChoices options={state.data.timeZones} value={timeZone} onChange={setTimeZone} />
    </> : null}
  </SleepPage>;
}
