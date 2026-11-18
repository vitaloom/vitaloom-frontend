import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureDetector, useExclusiveGestures, useLongPressGesture, useTapGesture } from 'react-native-gesture-handler';
import { Alert, AppState, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/store/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { radius, shadows, sizing, spacing } from '@/theme';

import { createTurnId } from './assistant-api';
import { courseApi } from './assistant-course-api';
import { courseMessages } from './course-messages';

const voiceEnabled = process.env.EXPO_PUBLIC_ASSISTANT_VOICE === 'true';
const MAX_RECORDING_SECONDS = 19;

export function GlobalFloatingLauncher() {
  const theme = useTheme();
  const t = useTranslations(courseMessages);
  const { status, user } = useAuth();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [recordingLimited, setRecordingLimited] = useState(false);
  const [sending, setSending] = useState(false);
  const held = useRef(false);
  const recordingRef = useRef(false);
  const capReached = useRef(false);
  const finishing = useRef(false);
  const mounted = useRef(true);
  const upload = useRef<AbortController | null>(null);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capStop = useRef<Promise<void> | null>(null);
  const pinnedSession = useRef<number | null>(null);
  const pinnedUserId = useRef<string | null>(null);
  const consent = useRef<{ userId: string; accepted: boolean } | undefined>(undefined);
  const onAssistantRoute = segments.some(segment => segment === 'assistant');
  const onTabRoute = segments.some(segment => segment === '(tabs)');
  const enabled = status === 'authenticated' && !!user && !onAssistantRoute
    && (process.env.EXPO_PUBLIC_ASSISTANT_COURSE !== 'false' || process.env.EXPO_PUBLIC_ASSISTANT_SANDBOX === 'true');
  const voiceAvailable = voiceEnabled && enabled && Platform.OS !== 'web'
    && process.env.EXPO_PUBLIC_ASSISTANT_COURSE !== 'false';

  const removeAudio = useCallback(async (uri?: string | null) => {
    if (!uri) return;
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }, []);

  const discardRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    if (capTimer.current) clearTimeout(capTimer.current);
    capTimer.current = null;
    try {
      if (capStop.current) await capStop.current;
      else await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    } catch {
      // A system interruption can stop the native recorder before this cleanup runs.
    }
    await removeAudio(recorder.uri);
    capStop.current = null;
    capReached.current = false;
    setRecordingLimited(false);
    if (mounted.current) setRecording(false);
  }, [recorder, removeAudio]);


  const sendRecording = useCallback(async () => {
    if (finishing.current || !recordingRef.current) return;
    finishing.current = true;
    recordingRef.current = false;
    const session = pinnedSession.current;
    const accountId = pinnedUserId.current;
    const signal = new AbortController();
    upload.current = signal;
    if (capTimer.current) clearTimeout(capTimer.current);
    capTimer.current = null;
    setRecording(false);
    setSending(true);
    try {
      if (capStop.current) await capStop.current;
      else if (!capReached.current) await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      const uri = recorder.uri;
      if (!mounted.current || signal.signal.aborted || !uri || !user || accountId !== user.id
        || session == null || session !== getApiSessionGeneration()) {
        await removeAudio(uri);
        return;
      }
      const row = await courseApi(session, signal.signal).voiceTurn(uri, createTurnId());
      if (!signal.signal.aborted && session === getApiSessionGeneration() && mounted.current) {
        router.push({ pathname: '/assistant', params: { conversationId: row.id } });
      }
    } catch {
      if (mounted.current && !upload.current?.signal.aborted) Alert.alert(t('title'), t('voiceUnavailable'));
    } finally {
      await removeAudio(recorder.uri);
      if (upload.current === signal) upload.current = null;
      finishing.current = false;
      capStop.current = null;
      capReached.current = false;
      setRecordingLimited(false);
      if (mounted.current) setSending(false);
    }
  }, [recorder, removeAudio, t, user]);

  const beginRecording = useCallback(async () => {
    const session = pinnedSession.current;
    const accountId = pinnedUserId.current;
    if (!user || accountId !== user.id || session == null || session !== getApiSessionGeneration()
      || !held.current || recordingRef.current || finishing.current || upload.current) return;
    let accepted = consent.current?.userId === user.id && consent.current.accepted;
    if (!held.current || !mounted.current || !user || accountId !== user.id
      || session !== getApiSessionGeneration()) return;
    if (!accepted) {
      Alert.alert(t('voiceConsentTitle'), t('voiceConsent'), [
        { text: t('voiceConsentCancel'), style: 'cancel' },
        { text: t('voiceConsentAccept'), onPress: () => {
          consent.current = { userId: user.id, accepted: true };
        } },
      ]);
      return;
    }
    consent.current = { userId: user.id, accepted: true };
    const permission = await AudioModule.getRecordingPermissionsAsync();
    if (!held.current || !mounted.current || accountId !== user.id || session !== getApiSessionGeneration()) return;
    const granted = permission.granted || (await requestRecordingPermissionsAsync()).granted;
    if (!held.current || !mounted.current || accountId !== user.id || session !== getApiSessionGeneration()) return;
    if (!granted) {
      Alert.alert(t('title'), t('microphoneDenied'));
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!held.current || !mounted.current || accountId !== user.id || session !== getApiSessionGeneration()) {
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
        return;
      }
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      if (!held.current || !mounted.current || accountId !== user.id || session !== getApiSessionGeneration()) {
        await recorder.stop().catch(() => undefined);
        await removeAudio(recorder.uri);
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
        return;
      }
      recorder.record();
      recordingRef.current = true;
      setRecording(true);
      capReached.current = false;
      setRecordingLimited(false);
      capTimer.current = setTimeout(() => {
        if (!recordingRef.current || capReached.current) return;
        capStop.current = recorder.stop().then(() => {
          capReached.current = true;
          if (mounted.current) setRecordingLimited(true);
        }).catch(() => {
          capReached.current = true;
        });
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      await removeAudio(recorder.uri);
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      Alert.alert(t('title'), t('voiceUnavailable'));
    }
  }, [recorder, removeAudio, t, user]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      held.current = false;
      upload.current?.abort();
      pinnedSession.current = null;
      pinnedUserId.current = null;
      if (capTimer.current) clearTimeout(capTimer.current);
      if (recordingRef.current) void discardRecording();
    };
  }, [discardRecording]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        held.current = false;
        pinnedSession.current = null;
        pinnedUserId.current = null;
        upload.current?.abort();
        if (recordingRef.current) void discardRecording();
      }
    });
    return () => subscription.remove();
  }, [discardRecording]);

  useEffect(() => {
    consent.current = undefined;
    held.current = false;
    pinnedSession.current = null;
    pinnedUserId.current = null;
    upload.current?.abort();
    if (recordingRef.current) void discardRecording();
  }, [discardRecording, status, user?.id]);

  const active = recording || sending;
  const label = recording ? recordingLimited ? t('voiceLimitReached') : t('voiceRecording') : sending ? t('voiceSending') : t('voiceLauncher');
  const holdGesture = useLongPressGesture({
    minDuration: 450,
    maxDistance: 12,
    runOnJS: true,
    enabled: voiceAvailable && !sending,
    onBegin: () => {
      held.current = true;
      pinnedSession.current = getApiSessionGeneration();
      pinnedUserId.current = user?.id ?? null;
    },
    onActivate: () => { void beginRecording(); },
    onDeactivate: event => {
      held.current = false;
      if (!event.canceled) void sendRecording();
    },
    onFinalize: event => {
      if (event.canceled) {
        held.current = false;
        pinnedSession.current = null;
        pinnedUserId.current = null;
        if (recordingRef.current) void discardRecording();
      }
    },
  });
  const tapGesture = useTapGesture({
    maxDuration: 10000,
    maxDistance: 12,
    runOnJS: true,
    enabled: !sending,
    onActivate: () => router.push('/assistant'),
  });
  const launcherGesture = useExclusiveGestures(holdGesture, tapGesture);
  if (!enabled) return null;
  const launcherContent = <ThemedText themeColor="onAccent" variant="labelStrong">{recording ? '●' : sending ? '…' : 'AI'}</ThemedText>;
  const buttonStyle = { minHeight: sizing.controlComfortable, minWidth: sizing.controlComfortable,
    paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: active ? theme.danger : theme.accent,
    alignItems: 'center' as const, justifyContent: 'center' as const, boxShadow: shadows.floating };
  const launcher = voiceAvailable
    ? <GestureDetector gesture={launcherGesture}>
      <View accessible accessibilityRole="button" accessibilityLabel={label}
        accessibilityHint={t('voiceLauncher')} accessibilityState={{ busy: sending }}
        onAccessibilityTap={() => { if (!sending) router.push('/assistant'); }} style={buttonStyle}>
        {launcherContent}
      </View>
    </GestureDetector>
    : <Pressable accessibilityRole="button" accessibilityLabel={label}
      onPress={() => router.push('/assistant')} style={buttonStyle}>{launcherContent}</Pressable>;
  return <View pointerEvents="box-none" style={{ position: 'absolute', right: spacing.md,
    bottom: Math.max(insets.bottom, spacing.md) + spacing.sm + (onTabRoute ? 72 : 0) }}>
    {active ? <View accessibilityLiveRegion="polite" style={{ alignSelf: 'flex-end', maxWidth: 240,
      marginBottom: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
      borderRadius: radius.md, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
      <ThemedText>{label}</ThemedText>
    </View> : null}
    {launcher}
  </View>;
}
