import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/store/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { ApiError, getApiSessionGeneration } from '@/lib/api/http-client';
import { layout, radius, sizing, spacing } from '@/theme';

import { createTurnId, sampleQuestion, sendSampleTurn } from './assistant-api';
import { assistantMessages } from './messages';
import AssistantCourseScreen from './assistant-course-screen';
import { assistantCourseEnabled } from './assistant-course-api';

export default function AssistantScreen() {
  const { status, user } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  if (status !== 'authenticated' || !user) return null;
  return !assistantCourseEnabled || mode === 'gemini'
    ? <AssistantTurn key={user.id} /> : <AssistantCourseScreen key={user.id} />;
}

function AssistantTurn() {
  const theme = useTheme();
  const t = useTranslations(assistantMessages);
  const [consent, setConsent] = useState(false);
  const [turnId, setTurnId] = useState<string>();
  const [reply, setReply] = useState<Awaited<ReturnType<typeof sendSampleTurn>>>();
  const [error, setError] = useState<'permission' | 'unavailable' | 'pending' | 'blocked' | 'expired'>();
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const retryUntil = useRef(0);
  useEffect(() => () => pending.current?.abort(), []);

  async function send() {
    if (pending.current) return;
    if (!consent) {
      setError('permission');
      return;
    }
    if (turnId && Date.now() >= retryUntil.current) {
      setError('expired');
      return;
    }
    const id = turnId ?? createTurnId();
    if (!turnId) retryUntil.current = Date.now() + 24 * 60 * 60 * 1000;
    const controller = new AbortController();
    const session = getApiSessionGeneration();
    pending.current = controller;
    setTurnId(id);
    setError(undefined);
    setLoading(true);
    try {
      const result = await sendSampleTurn(id, session, controller.signal);
      if (!controller.signal.aborted && session === getApiSessionGeneration()) setReply(result);
    } catch (failure) {
      if (controller.signal.aborted || session !== getApiSessionGeneration()) return;
      if (failure instanceof ApiError && [401, 403, 404].includes(failure.status)) setError('blocked');
      else if (failure instanceof ApiError && failure.code === 'ASSISTANT_TURN_PENDING') setError('pending');
      else setError('unavailable');
    } finally {
      pending.current = null;
      if (!controller.signal.aborted && session === getApiSessionGeneration()) setLoading(false);
    }
  }

  function newTurn() {
    setConsent(false);
    setTurnId(undefined);
    setReply(undefined);
    setError(undefined);
  }

  const answer = reply?.outcome === 'ANSWERED' ? reply.answer
    : reply?.outcome === 'PERMISSION_REQUIRED' ? t('permission')
      : reply?.outcome === 'INSUFFICIENT_EVIDENCE' ? t('noEvidence')
        : reply ? t('unavailable') : undefined;
  const turnFinished = !!reply || error === 'expired';
  const action = turnFinished ? t('newTurn') : turnId ? t('retry') : t('send');
  const panel = { backgroundColor: theme.backgroundElement, borderRadius: radius.lg, padding: spacing.md };

  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
    <Stack.Screen options={{ headerShown: true, title: t('title') }} />
    <ScrollView contentContainerStyle={{ alignItems: 'center', padding: spacing.md }}>
      <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
        <ThemedText themeColor="textSecondary">{t('notice')}</ThemedText>
        <View style={panel}>
          <ThemedText variant="labelStrong">{t('you')}</ThemedText>
          <ThemedText>{sampleQuestion}</ThemedText>
        </View>
        {answer ? <View style={[panel, { gap: spacing.sm }]} accessibilityLiveRegion="polite">
          <ThemedText variant="labelStrong">{t('assistant')}</ThemedText>
          <ThemedText>{answer}</ThemedText>
          {reply?.hasJournalSource ? <Pressable accessibilityRole="link"
            onPress={() => router.push('/sleep/journal')} style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}>
            <ThemedText themeColor="accent">{t('source')}</ThemedText>
          </Pressable> : null}
        </View> : null}
        {!reply ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText style={{ flex: 1 }}>{t('consent')}</ThemedText>
          <Switch accessibilityLabel={t('consent')} disabled={loading} value={consent} onValueChange={setConsent} />
        </View> : null}
        {error ? <ThemedText accessibilityLiveRegion="polite" themeColor="danger">{t(error)}</ThemedText> : null}
        <Pressable accessibilityRole="button" disabled={loading || error === 'blocked'}
          accessibilityState={{ disabled: loading || error === 'blocked', busy: loading }}
          onPress={turnFinished ? newTurn : () => void send()}
          style={{ minHeight: sizing.controlComfortable, justifyContent: 'center', alignItems: 'center',
            borderRadius: radius.lg, backgroundColor: theme.accent, flexDirection: 'row', gap: spacing.sm }}>
          {loading ? <ActivityIndicator color={theme.onAccent} /> : null}
          <ThemedText themeColor="onAccent" variant="labelStrong">{loading ? t('loading') : action}</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
