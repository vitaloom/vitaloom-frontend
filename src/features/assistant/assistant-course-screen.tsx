import { router, Stack } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslations } from '@/i18n';
import { ApiError, getApiSessionGeneration } from '@/lib/api/http-client';
import { layout, radius, sizing, spacing } from '@/theme';

import { useAssistantAccess } from './assistant-access-provider';
import { createTurnId } from './assistant-api';
import { type Conversation, type ConversationSummary, courseApi } from './assistant-course-api';
import { courseMessages } from './course-messages';
import { AssistantVoiceInput } from './assistant-voice-input';
import type { File as ExpoFile } from 'expo-file-system';
import { removeVoiceFile } from './assistant-voice-files';

const voiceEnabled = Platform.OS !== 'web' && process.env.EXPO_PUBLIC_ASSISTANT_VOICE === 'true';

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
  const sessionGeneration = getApiSessionGeneration();
  const t = useTranslations(courseMessages);
  const { refresh } = useAssistantAccess();
  const { locale } = useI18n();
  const theme = useTheme();
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [current, setCurrent] = useState<Conversation>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'error' | 'blocked' | 'conflict' | 'writeUncertain'>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retry, setRetry] = useState<{ id: string; text: string; turnId: string }>();
  const [voiceRetryAvailable, setVoiceRetryAvailable] = useState(false);
  const voiceRetry = useRef<{ audio: ExpoFile; turnId: string; conversationId?: string; session: number } | undefined>(undefined);
  const pending = useRef<AbortController | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const turnCount = current?.turns.length ?? 0;
  const draft = text.trim();
  const retryTurn = retry && retry.id === current?.id && (!draft || retry.text === draft) ? retry : undefined;

  const clearVoiceRetry = useCallback(() => {
    removeVoiceFile(voiceRetry.current?.audio.uri);
    voiceRetry.current = undefined;
    setVoiceRetryAvailable(false);
  }, []);

  const perform = useCallback(async <T,>(work: (client: ReturnType<typeof courseApi>) => Promise<T>,
    apply: (result: T) => void, onFailure?: (status: number) => void) => {
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
      if (status === 403) void refresh();
      if (failure instanceof ApiError && failure.code === 'ASSISTANT_WRITE_UNCERTAIN') {
        setError('writeUncertain');
      } else {
        setError([401, 403, 404].includes(status) ? 'blocked' : status === 409 ? 'conflict' : 'error');
      }
      onFailure?.(status);
    } finally {
      if (pending.current === abort) pending.current = null;
      if (active()) setBusy(false);
    }
  }, [refresh]);

  const load = useCallback((nextPage: number) => perform(client => client.list(nextPage), result => {
    setHistory(result.items);
    setHasMore(result.hasMore);
    setPage(nextPage);
  }), [perform]);

  const open = useCallback((row: Conversation) => {
    clearVoiceRetry();
    setCurrent(row);
    setConfirmDelete(false);
    setText('');
    setRetry(undefined);
  }, [clearVoiceRetry]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      if (initialConversationId) void perform(client => client.open(initialConversationId), open);
      else void load(0);
    }, 0);
    return () => {
      clearTimeout(initialLoad);
      pending.current?.abort();
      pending.current = null;
      removeVoiceFile(voiceRetry.current?.audio.uri);
      voiceRetry.current = undefined;
    };
  }, [initialConversationId, load, open, perform]);

  useEffect(() => {
    const pendingVoice = voiceRetry.current;
    if (!pendingVoice || pendingVoice.session === sessionGeneration) return;
    pending.current?.abort();
    pending.current = null;
    clearVoiceRetry();
    setBusy(false);
    setError('error');
  }, [clearVoiceRetry, sessionGeneration]);

  useEffect(() => {
    if (turnCount) scroll.current?.scrollToEnd({ animated: false });
  }, [turnCount]);

  function send() {
    const trimmed = draft || retryTurn?.text;
    if (!current || !trimmed || pending.current) return;
    const turnId = retryTurn?.turnId ?? createTurnId();
    setRetry({ id: current.id, text: trimmed, turnId });
    setText('');
    void perform(client => client.send(current.id, trimmed, turnId), row => {
      setCurrent(row);
      setRetry(undefined);
    });
  }

  function sendVoice(file: ExpoFile) {
    const saved = voiceRetry.current;
    const attempt = saved?.audio === file ? saved : {
      audio: file,
      turnId: createTurnId(),
      conversationId: current?.id,
      session: getApiSessionGeneration(),
    };
    voiceRetry.current = attempt;
    setVoiceRetryAvailable(false);
    void perform(client => client.voiceTurn(attempt.audio, attempt.turnId, attempt.conversationId), row => {
      setCurrent(row);
      removeVoiceFile(attempt.audio.uri);
      voiceRetry.current = undefined;
      setVoiceRetryAvailable(false);
    }, status => {
      if (status >= 400 && status < 500 && status !== 409) clearVoiceRetry();
      else setVoiceRetryAvailable(true);
    });
  }

  function retryVoice() {
    const saved = voiceRetry.current;
    if (!saved || pending.current) return;
    if (saved.session !== getApiSessionGeneration()) {
      clearVoiceRetry();
      setError('error');
      return;
    }
    sendVoice(saved.audio);
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
          <View style={panel}>
            <Button title={t('create')} disabled={busy}
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
              clearVoiceRetry();
              setCurrent(undefined);
              void load(0);
            }} />
            <Button title={confirmDelete ? t('confirmDelete') : t('delete')} disabled={busy} onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              void perform(async client => {
                await client.remove(current.id);
                return client.list(0);
              }, result => {
                setCurrent(undefined);
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
            }} editable={!busy} maxLength={300} multiline
            style={{ backgroundColor: theme.backgroundElement, color: theme.text, borderRadius: radius.lg,
              minHeight: sizing.controlComfortable, padding: spacing.md }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button title={retryTurn ? t('retry') : t('send')}
              disabled={busy || (!draft && !retryTurn) || turnCount >= 50} onPress={send} />
            {voiceRetryAvailable ? <Button title={t('retry')} disabled={busy} onPress={retryVoice} /> : null}
            {voiceEnabled ? <AssistantVoiceInput disabled={busy || turnCount >= 50} onStart={() => {
              if (busy || pending.current || turnCount >= 50) return false;
              clearVoiceRetry();
              setBusy(true);
              return true;
            }} onReady={sendVoice} onFailure={() => {
              setBusy(false);
              setError('error');
            }} /> : null}
          </View>
          {turnCount >= 50 && <ThemedText>{t('limit')}</ThemedText>}
        </>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
