import { ThemedText } from '@/components/themed-text';
import { SleepCard, SleepSegments } from './sleep-ui';

export function SleepTimeZoneChoices({ options, value, onChange }: {
  options: string[]; value: string; onChange: (value: string) => void;
}) {
  if (!options.length) return null;
  return <SleepCard>
    <ThemedText variant="labelStrong">Reference timezone for bedtime and wake variation</ThemedText>
    <SleepSegments options={[{ value: '', label: 'None' }, ...options.map((zone) => ({ value: zone, label: zone }))]}
      value={value} onChange={onChange} />
  </SleepCard>;
}
