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

type RecordingHold = { session: number; accountId: string };

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
  const hold = useRef<RecordingHold | null>(null);
  const recordingRef = useRef(false);
  const capReached = useRef(false);
  const preparing = useRef(false);
  const finishing = useRef(false);
  const mounted = useRef(true);
  const upload = useRef<AbortController | null>(null);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capStop = useRef<Promise<void> | null>(null);
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
    finishing.current = true;
    recordingRef.current = false;
    if (capTimer.current) clearTimeout(capTimer.current);
    capTimer.current = null;
    try {
      if (capStop.current) await capStop.current;
      else await recorder.stop();
    } catch {
      // The operating system may have already stopped the recording.
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      await removeAudio(recorder.uri);
      capStop.current = null;
      capReached.current = false;
      finishing.current = false;
      if (mounted.current) {
        setRecordingLimited(false);
        setRecording(false);
      }
    }
  }, [recorder, removeAudio]);

  const sendRecording = useCallback(async ({ session, accountId }: RecordingHold) => {
    if (finishing.current || !recordingRef.current) return;
    finishing.current = true;
    recordingRef.current = false;
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
      if (!mounted.current || signal.signal.aborted || !uri || accountId !== user?.id
        || session !== getApiSessionGeneration()) return;
      const row = await courseApi(session, signal.signal).voiceTurn(uri, createTurnId());
      if (!signal.signal.aborted && session === getApiSessionGeneration() && mounted.current) {
        router.push({ pathname: '/assistant', params: { conversationId: row.id } });
      }
    } catch {
      if (mounted.current && !signal.signal.aborted) Alert.alert(t('title'), t('voiceUnavailable'));
    } finally {
      await removeAudio(recorder.uri);
      if (upload.current === signal) upload.current = null;
      finishing.current = false;
      capStop.current = null;
      capReached.current = false;
      if (mounted.current) {
        setRecordingLimited(false);
        setSending(false);
      }
    }
  }, [recorder, removeAudio, t, user]);

  const beginRecording = useCallback(async () => {
    const currentHold = hold.current;
    if (!currentHold || !user || user.id !== currentHold.accountId || preparing.current
      || recordingRef.current || finishing.current) return;
    const stillHeld = () => mounted.current && hold.current === currentHold
      && currentHold.session === getApiSessionGeneration();
    if (!stillHeld()) return;
    if (consent.current?.userId !== user.id || !consent.current.accepted) {
      Alert.alert(t('voiceConsentTitle'), t('voiceConsent'), [
        { text: t('voiceConsentCancel'), style: 'cancel' },
        { text: t('voiceConsentAccept'), onPress: () => {
          if (mounted.current && currentHold.session === getApiSessionGeneration()) {
            consent.current = { userId: user.id, accepted: true };
          }
        } },
      ]);
      return;
    }
    preparing.current = true;
    let audioModeEnabled = false;
    try {
      const permission = await AudioModule.getRecordingPermissionsAsync();
      if (!stillHeld()) return;
      const granted = permission.granted || (await requestRecordingPermissionsAsync()).granted;
      if (!stillHeld()) return;
      if (!granted) {
        Alert.alert(t('title'), t('microphoneDenied'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      audioModeEnabled = true;
      if (!stillHeld()) return;
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      if (!stillHeld()) {
        await recorder.stop().catch(() => undefined);
        await removeAudio(recorder.uri);
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
      if (stillHeld()) Alert.alert(t('title'), t('voiceUnavailable'));
    } finally {
      if (audioModeEnabled && !recordingRef.current) {
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
      preparing.current = false;
    }
  }, [recorder, removeAudio, t, user]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      hold.current = null;
      upload.current?.abort();
      if (capTimer.current) clearTimeout(capTimer.current);
      if (recordingRef.current) void discardRecording();
    };
  }, [discardRecording]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        hold.current = null;
        upload.current?.abort();
        if (recordingRef.current) void discardRecording();
      }
    });
    return () => subscription.remove();
  }, [discardRecording]);

  useEffect(() => {
    consent.current = undefined;
    hold.current = null;
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
      if (user) hold.current = { session: getApiSessionGeneration(), accountId: user.id };
    },
    onActivate: () => { void beginRecording(); },
    onDeactivate: event => {
      const released = hold.current;
      hold.current = null;
      if (!event.canceled && released) void sendRecording(released);
    },
    onFinalize: event => {
      if (event.canceled) {
        hold.current = null;
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
