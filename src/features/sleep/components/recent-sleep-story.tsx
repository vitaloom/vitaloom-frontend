import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTranslations } from '@/i18n';
import { SleepButton, SleepCard, SleepNotice } from './sleep-ui';
import { useSleepRepository } from '../hooks/use-sleep';
import { sleepMessages } from '../messages';
import type { RecentSleepReport } from '../types/sleep';
import { requestSleepAi } from '../api/sleep-ai-requests';

export function RecentSleepStory({ report }: { report: RecentSleepReport }) {
  const repository = useSleepRepository();
  const t = useTranslations(sleepMessages);
  const [snapshot, setSnapshot] = useState<{ repository: typeof repository; reportKey: string; enabled: boolean; available: boolean; story?: Awaited<ReturnType<typeof repository.getRecentStory>>; error?: string }>();
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const eligible = report.dataStatus === 'verified' && report.period.end === repository.getContext().today
    && report.highlights?.some((item) => item.code !== 'A01' && item.status === 'READY') === true;
  const reportKey = JSON.stringify(report);

  useFocusEffect(useCallback(() => {
    let active = true;
    const requestId = ++generation.current;
    setSnapshot(undefined);
    void (async () => {
      const consent = await repository.getAiConsent();
      if (!active) return;
      if (consent.kind === 'error') {
        setSnapshot({ repository, reportKey, enabled: false, available: false, error: consent.message });
        return;
      }
      const current = { repository, reportKey, enabled: consent.data.enabled, available: consent.data.available };
      setSnapshot(current);
      if (consent.data.enabled && consent.data.available && eligible
        && report.period.end === repository.getContext().today) {
        const story = await requestSleepAi(repository, `story:${reportKey}`, () => repository.getRecentStory());
        if (active && generation.current === requestId) setSnapshot({ ...current, story });
      }
    })();
    return () => { active = false; generation.current += 1; setSnapshot(undefined); setBusy(false); };
  }, [repository, eligible, reportKey, report.period.end]));

  const current = snapshot?.repository === repository && snapshot.reportKey === reportKey ? snapshot : undefined;
  if (!current) return <SleepNotice title={t('aiPreferenceLoading')} loading />;
  if (current.error && !current.available) return <SleepNotice title={t('aiPreferenceError')} message={current.error} />;

  async function setEnabled(enabled: boolean) {
    if (!current) return;
    const requestId = ++generation.current;
    if (!enabled) setSnapshot({ ...current, enabled: false, story: undefined });
    setBusy(true);
    const result = await repository.mutate(`consent-${Date.now()}`, { kind: 'set-ai-consent', enabled });
    if (generation.current !== requestId) return;
    setBusy(false);
    if (result.kind !== 'confirmed') {
      setSnapshot({ ...current, story: undefined, error: result.kind === 'unknown' ? t('aiPreferenceError') : result.message });
      return;
    }
    setSnapshot({ ...current, enabled, story: undefined });
    if (enabled && current.available && eligible && report.period.end === repository.getContext().today) {
      const story = await requestSleepAi(repository, `story:${reportKey}`, () => repository.getRecentStory());
      if (generation.current === requestId) setSnapshot((value) => value?.repository === repository ? { ...value, story } : value);
    }
  }

  const story = current.story;
  const showStory = current.enabled && current.available && eligible && !current.error;
  return <>
    {current.available ? <SleepCard tone="warm">
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('aiConsentTitle')}</ThemedText>
      <ThemedText variant="subhead">{t('aiConsentDescription')}</ThemedText>
      <SleepButton label={current.enabled ? t('aiConsentTurnOff') : t('aiConsentTurnOn')}
        onPress={() => void setEnabled(!current.enabled)} variant="secondary" busy={busy} disabled={busy} />
    </SleepCard> : null}
    {current.error ? <SleepNotice title={t('aiPreferenceError')} message={current.error} /> : null}
    {showStory && !story ? <SleepCard tone="warm">
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('recentStoryTitle')}</ThemedText>
      <ThemedText accessibilityLiveRegion="polite" variant="subhead">{t('recentStoryLoading')}</ThemedText>
    </SleepCard> : null}
    {showStory && story?.kind === 'error'
      ? <SleepNotice title={t('recentStoryUnavailable')} message={story.message} /> : null}
    {showStory && story?.kind === 'ready'
      && ['STORY', 'FALLBACK'].includes(story.data.status) ? <SleepCard tone="warm">
      <ThemedText accessibilityRole="header" variant="bodyStrong">{t('recentStoryTitle')}</ThemedText>
      {story.data.status === 'FALLBACK' ? <ThemedText variant="caption">{t('recentStoryFallback')}</ThemedText> : null}
      {story.data.headline ? <ThemedText variant="bodyStrong">{story.data.headline}</ThemedText> : null}
      {story.data.observations?.map((observation, index) => <SleepCard key={`${observation.insightCode}-${index}`}
        label={t('openStoryInsight', { code: observation.insightCode })}
        onPress={() => router.push({ pathname: '/sleep/insights/[code]', params: { code: observation.insightCode } })}>
        <ThemedText variant="subhead">{observation.text} · {observation.dataContext}</ThemedText>
      </SleepCard>)}
    </SleepCard> : null}
  </>;
}
