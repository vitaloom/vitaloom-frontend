import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { useSleepMutation, useSleepRead, useSleepRepository } from '../hooks/use-sleep';
import type { AiRequest } from '../types/sleep';
import { SleepButton, SleepCard, SleepNotice, SleepWriteNotice } from './sleep-ui';

export function SleepAiSection({ request, requestKey }: { request: AiRequest; requestKey: string }) {
  const repository = useSleepRepository();
  const consent = useSleepRead(() => repository.getAiConsent(), 'ai-consent');
  const [requestedKey, setRequestedKey] = useState<string>();
  const mutation = useSleepMutation(() => consent.reload(), 'ai-consent');
  const title = request.kind === 'story' ? 'Optional story preview' : 'AI Explanation';
  if (consent.state.kind === 'loading') return null;
  if (consent.state.kind === 'error') return <SleepNotice title="AI preference unavailable" message={consent.state.message}
    actionLabel="Retry" onAction={consent.reload} />;
  const enabled = consent.state.data;
  const unknown = mutation.result?.kind === 'unknown';

  return <SleepCard tone="lilac">
    <ThemedText accessibilityRole="header" variant="bodyStrong">{title}</ThemedText>
    {enabled ? <>
      {requestedKey === requestKey ? <AiFixture request={request} requestKey={requestKey} /> : <>
        {requestedKey ? <ThemedText variant="subhead">The evidence changed. Request the updated demo content.</ThemedText> : null}
        <SleepButton label={request.kind === 'story' ? 'Preview demo story' : 'Preview demo explanation'}
          onPress={() => setRequestedKey(requestKey)} variant="secondary" disabled={unknown || mutation.busy} />
      </>}
      <SleepButton label="Turn off AI previews" onPress={() => {
        setRequestedKey(undefined);
        mutation.run({ kind: 'set-ai-consent', enabled: false });
      }} variant="quiet" busy={mutation.busy} disabled={unknown} />
    </> : <>
      <ThemedText variant="subhead">
        AI previews are optional. This demo uses a small set of structured evidence and runs entirely in the app.
        A future service would use only the evidence needed for the requested insight or report.
      </ThemedText>
      <SleepButton label="Allow AI previews" onPress={() => mutation.run({ kind: 'set-ai-consent', enabled: true })}
        variant="secondary" busy={mutation.busy} disabled={unknown} />
    </>}
    <SleepWriteNotice result={mutation.result} reconcile={mutation.reconcile} />
  </SleepCard>;
}

function AiFixture({ request, requestKey }: { request: AiRequest; requestKey: string }) {
  const repository = useSleepRepository();
  const { state, reload } = useSleepRead(() => repository.getAi(request), requestKey);
  if (state.kind === 'loading') return <ThemedText accessibilityLiveRegion="polite" variant="subhead">Loading preview…</ThemedText>;
  if (state.kind === 'error' || state.data.status === 'unavailable') {
    return <SleepNotice title="AI preview unavailable" actionLabel="Retry" onAction={reload} />;
  }
  const result = state.data;
  if (result.status === 'stale') return <ThemedText variant="subhead">The evidence changed. Refresh the insight or report.</ThemedText>;
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
