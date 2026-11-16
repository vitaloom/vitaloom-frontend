import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslations } from '@/i18n';
import { sleepMessages } from '../messages';
import { ThemedText } from '@/components/themed-text';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { AiRequest, AiResponse } from '../types/sleep';
import { pendingSleepAi, requestSleepAi } from '../api/sleep-ai-requests';
import { SleepButton, SleepCard, SleepNotice, SleepWriteNotice } from './sleep-ui';

export function SleepAiSection({ request, requestKey, onStale }: { request: AiRequest; requestKey: string; onStale?: () => void }) {
  const repository = useSleepRepository();
  const t = useTranslations(sleepMessages);
  const consent = useSleepRead(() => repository.getAiConsent(), 'ai-consent', false, true);
  const [requested, setRequested] = useState<{
    key: string; repository: typeof repository; response: ReturnType<typeof repository.getAi>;
  }>();
  useFocusEffect(useCallback(() => {
    const response = pendingSleepAi<AiResponse>(repository, requestKey);
    setRequested(response ? { key: requestKey, repository, response } : undefined);
    return () => setRequested(undefined);
  }, [repository, requestKey]));
  const requestPreview = () => setRequested({ key: requestKey, repository,
    response: requestSleepAi(repository, requestKey, () => repository.getAi(request)) });
  const mutation = useSleepMutation(() => consent.reload(), 'ai-consent');
  const title = request.kind === 'story' ? 'Optional story preview' : undefined;
  if (consent.state.kind === 'loading') return null;
  if (consent.state.kind === 'error') return <SleepNotice title="AI preference unavailable" message={consent.state.message}
    actionLabel="Retry" onAction={consent.reload} />;
  const enabled = consent.state.data.enabled;
  if (!consent.state.data.available) return null;
  const unknown = mutation.result?.kind === 'unknown';

  return <SleepCard tone="lilac">
    {title ? <ThemedText accessibilityRole="header" variant="bodyStrong">{title}</ThemedText> : null}
    {enabled ? <>
      {requested?.repository === repository && requested.key === requestKey ? <AiFixture request={request}
        requestKey={requestKey} response={requested.response} onRetry={requestPreview}
        onStale={onStale} onConsentRequired={() => { setRequested(undefined); consent.reload(); }} /> : <>
        <SleepButton label={request.kind === 'story' ? 'Preview demo story' : t('explainWithAi')}
          onPress={requestPreview} variant="secondary" disabled={unknown || mutation.busy} />
      </>}
      <SleepButton label="Turn off AI previews" onPress={() => {
        setRequested(undefined);
        mutation.run({ kind: 'set-ai-consent', enabled: false });
      }} variant="quiet" busy={mutation.busy} disabled={unknown} />
    </> : <>
      <ThemedText variant="subhead">
        {request.kind === 'explanation' ? t('aiExplanationConsent') :
          'AI previews are optional. This demo uses a small set of structured evidence and runs entirely in the app.'}
      </ThemedText>
      <SleepButton label="Allow AI previews" onPress={() => mutation.run({ kind: 'set-ai-consent', enabled: true })}
        variant="secondary" busy={mutation.busy} disabled={unknown} />
    </>}
    <SleepWriteNotice result={mutation.result} reconcile={mutation.reconcile} />
  </SleepCard>;
}

function AiFixture({ request, requestKey, response, onRetry, onStale, onConsentRequired }: {
  request: AiRequest; requestKey: string; onStale?: () => void; onConsentRequired: () => void;
  response: ReturnType<ReturnType<typeof useSleepRepository>['getAi']>; onRetry: () => void;
}) {
  const [snapshot, setSnapshot] = useState<{ response: typeof response; state: Awaited<typeof response> }>();
  useEffect(() => {
    let active = true;
    void response.then((state) => { if (active) setSnapshot({ response, state }); });
    return () => { active = false; };
  }, [response, requestKey]);
  const state = snapshot?.response === response ? snapshot.state : { kind: 'loading' as const };
  const status = state.kind === 'ready' ? state.data.status : undefined;
  const staleRead = state.kind === 'error' && state.code === 'STALE';
  const versionMismatch = state.kind === 'ready' && request.kind === 'explanation'
    && (state.data.status === 'explanation' || state.data.status === 'fallback')
    && state.data.evidenceFingerprint !== request.insight.version;
  useEffect(() => {
    if (status === 'stale' || status === 'ineligible' || versionMismatch
      || staleRead) onStale?.();
    if (status === 'consent-required') onConsentRequired();
  }, [status, versionMismatch, staleRead, onStale, onConsentRequired]);
  if (versionMismatch) return null;
  if (state.kind === 'loading') return <ThemedText accessibilityLiveRegion="polite" variant="subhead">Loading preview…</ThemedText>;
  if (state.kind === 'error' || state.data.status === 'unavailable') {
    return <SleepNotice title="AI preview unavailable" actionLabel="Retry" onAction={onRetry} />;
  }
  const result = state.data;
  if (result.status === 'stale') return <ThemedText variant="subhead">The evidence changed. Refresh the insight or report.</ThemedText>;
  if (request.kind === 'explanation' && (result.status === 'explanation' || result.status === 'fallback')) return <>
    {result.status === 'fallback' ? <ThemedText variant="caption">Deterministic evidence explanation</ThemedText> : null}
    <ThemedText variant="bodyStrong">Quan sát được gì</ThemedText>
    <ThemedText variant="subhead">{result.observation}</ThemedText>
    <ThemedText variant="bodyStrong">Dữ liệu & phép tính</ThemedText>
    <ThemedText variant="subhead">{result.evidenceBasis}</ThemedText>
    <ThemedText variant="bodyStrong">Cần lưu ý</ThemedText>
    <ThemedText variant="subhead">{result.limitations}</ThemedText>
  </>;
  if (result.status !== 'fixture') return <ThemedText variant="subhead">A preview is unavailable for this evidence.</ThemedText>;
  return <>
    {request.kind === 'story' ? <ThemedText variant="bodyStrong">AI Weekly Sleep Story</ThemedText> : null}
    <ThemedText variant="label" themeColor="textSecondary">Deterministic demo fixture</ThemedText>
    <ThemedText variant="bodyStrong">{result.headline}</ThemedText>
    {result.observations.map((observation, index) => <ThemedText key={result.sources[index]} variant="subhead">
      {result.sources[index]} · {observation}
    </ThemedText>)}
    <ThemedText variant="caption" themeColor="textSecondary">{result.limitations}</ThemedText>
  </>;
}
