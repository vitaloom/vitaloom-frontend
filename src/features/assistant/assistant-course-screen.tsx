import { router, Stack } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { ApiError, getApiSessionGeneration } from '@/lib/api/http-client';
import { layout, radius, sizing, spacing } from '@/theme';

import { createTurnId } from './assistant-api';
import { type Conversation, type ConversationSummary, courseApi } from './assistant-course-api';
import { courseMessages } from './course-messages';

function sourceRoute(value: string) {
  switch (value) {
    case '/sleep/journal': return '/sleep/journal';
    case '/sleep/recent': return '/sleep/recent';
    case '/water/add': return '/water/add';
    case '/water/progress': return '/water/progress';
    default: return undefined;
  }
}

export default function AssistantCourseScreen({ initialConversationId }: { initialConversationId?: string }) {
  const t = useTranslations(courseMessages);
  const { locale } = useI18n();
  const theme = useTheme();
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [current, setCurrent] = useState<Conversation>();
  const [accepted, setAccepted] = useState(false);
  const [text, setText] = useState('');
  const [geminiAccepted, setGeminiAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'error' | 'blocked' | 'conflict'>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retry, setRetry] = useState<{ id: string; text: string; turnId: string; geminiAccepted: boolean }>();
  const pending = useRef<AbortController | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const turnCount = current?.turns.length ?? 0;
  const allowGemini = geminiAccepted;
  const canRetry = retry?.id === current?.id && retry?.text === text.trim()
    && retry?.geminiAccepted === allowGemini;

  const perform = useCallback(async <T,>(work: (client: ReturnType<typeof courseApi>) => Promise<T>,
    apply: (result: T) => void) => {
    if (pending.current) return;
    const abort = new AbortController();
    const session = getApiSessionGeneration();
    pending.current = abort;
    const active = () => !abort.signal.aborted && session === getApiSessionGeneration();
    setBusy(true);
    setError(undefined);
    try {
      const result = await work(courseApi(session, abort.signal));
      if (active()) apply(result);
    } catch (failure) {
      if (!active()) return;
      const status = failure instanceof ApiError ? failure.status : 0;
      setError([401, 403, 404].includes(status) ? 'blocked' : status === 409 ? 'conflict' : 'error');
    } finally {
      if (pending.current === abort) pending.current = null;
      if (active()) setBusy(false);
    }
  }, []);

  const load = useCallback((nextPage: number) => perform(client => client.list(nextPage), result => {
    setHistory(result.items);
    setHasMore(result.hasMore);
    setPage(nextPage);
  }), [perform]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      if (initialConversationId) void perform(client => client.open(initialConversationId), open);
      else void load(0);
    }, 0);
    return () => {
      clearTimeout(initialLoad);
      pending.current?.abort();
      pending.current = null;
    };
  }, [initialConversationId, load, perform]);

  useEffect(() => {
    if (turnCount) scroll.current?.scrollToEnd({ animated: false });
  }, [turnCount]);

  function open(row: Conversation) {
    setCurrent(row);
    setConfirmDelete(false);
    setText('');
    setGeminiAccepted(false);
    setRetry(undefined);
  }

  function send() {
    if (!current || !text.trim() || pending.current) return;
    const trimmed = text.trim();
    const turnId = canRetry && retry ? retry.turnId : createTurnId();
    setRetry({ id: current.id, text: trimmed, turnId, geminiAccepted: allowGemini });
    void perform(client => client.send(current.id, trimmed, turnId, allowGemini), row => {
      setCurrent(row);
      setText('');
      setGeminiAccepted(false);
      setRetry(undefined);
    });
  }

  const panel = { backgroundColor: theme.backgroundElement, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm };

  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
    <Stack.Screen options={{ headerShown: true, title: t('title') }} />
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ alignItems: 'center', padding: spacing.md }}>
      <View style={{ width: '100%', maxWidth: layout.screenMax, gap: spacing.md }}>
        <ThemedText themeColor="textSecondary">{t('notice')}</ThemedText>
        {busy && <ActivityIndicator accessibilityLabel={t('loading')} />}
        {error && <ThemedText themeColor="danger" accessibilityLiveRegion="polite">{t(error)}</ThemedText>}
        {!current ? <>
          <Button title={t('gemini')} disabled={busy}
            onPress={() => router.push({ pathname: '/assistant', params: { mode: 'gemini' } })} />
          <View style={panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText style={{ flex: 1 }}>{t('consent')}</ThemedText>
              <Switch disabled={busy} value={accepted} onValueChange={setAccepted} accessibilityLabel={t('consent')} />
            </View>
            <Button title={t('create')} disabled={busy || !accepted}
              onPress={() => void perform(client => client.create(), open)} />
          </View>
          <ThemedText variant="labelStrong">{t('history')}</ThemedText>
          {history.map(row => <Pressable key={row.id} accessibilityRole="button" disabled={busy}
            onPress={() => void perform(client => client.open(row.id), open)} style={panel}>
            <ThemedText>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
              .format(new Date(row.updatedAt))}</ThemedText>
            <ThemedText themeColor="textSecondary">{row.id.slice(0, 8)}</ThemedText>
          </Pressable>)}
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button title={t('refresh')} disabled={busy} onPress={() => void load(page)} />
            {page > 0 && <Button title={t('previous')} disabled={busy} onPress={() => void load(page - 1)} />}
            {hasMore && <Button title={t('next')} disabled={busy} onPress={() => void load(page + 1)} />}
          </View>
        </> : <>
          <View style={panel}>
            <Button title={t('history')} disabled={busy} onPress={() => {
              setCurrent(undefined);
              setAccepted(false);
              setGeminiAccepted(false);
              void load(0);
            }} />
            <Button title={confirmDelete ? t('confirmDelete') : t('delete')} disabled={busy} onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              void perform(async client => {
                await client.remove(current.id);
                return client.list(0);
              }, result => {
                setCurrent(undefined);
                setAccepted(false);
                setHistory(result.items);
                setHasMore(result.hasMore);
                setPage(0);
              });
            }} />
          </View>
          {current.turns.map(turn => <View key={turn.turnId} style={panel}>
            <ThemedText variant="labelStrong">{turn.text}</ThemedText>
            {turn.parts.map((part, index) => {
              const source = part.source;
              const route = source && sourceRoute(source.route);
              return <View key={index} style={{ gap: spacing.xs }}>
                <ThemedText>{part.status === 'PERMISSION_REQUIRED' ? t('personalPermissionRequired') : part.text}</ThemedText>
                {source && !route && <ThemedText themeColor="textSecondary">{source.title} · {source.id} · v{source.version}</ThemedText>}
                {!!route && !!source && <Pressable accessibilityRole="link" onPress={() => router.push(route)}
                  style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}>
                  <ThemedText themeColor="accent">{source.title}
                    {source.version ? ` · v${source.version}` : ''}
                    {source.from ? ` · ${source.from}` : ''}
                    {source.to && source.to !== source.from ? ` – ${source.to}` : ''}</ThemedText>
                </Pressable>}
              </View>;
            })}
          </View>)}
          <TextInput accessibilityLabel={t('input')} placeholder={t('input')} placeholderTextColor={theme.textSecondary}
            value={text} onChangeText={value => {
              setText(value);
              setGeminiAccepted(false);
            }} editable={!busy} maxLength={300} multiline
            style={{ backgroundColor: theme.backgroundElement, color: theme.text, borderRadius: radius.lg,
              minHeight: sizing.controlComfortable, padding: spacing.md }} />
          {text.trim().length > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ThemedText style={{ flex: 1 }}>{t('geminiConsent')}</ThemedText>
            <Switch disabled={busy} value={geminiAccepted} onValueChange={setGeminiAccepted}
              accessibilityLabel={t('geminiConsent')} />
          </View>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button title={canRetry ? t('retry') : t('send')}
              disabled={busy || !text.trim() || turnCount >= 50} onPress={send} />
          </View>
          {turnCount >= 50 && <ThemedText>{t('limit')}</ThemedText>}
        </>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
