import { AudioModule, type RecordingStatus, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { deleteAsync } from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureDetector, useExclusiveGestures, useLongPressGesture, useTapGesture } from 'react-native-gesture-handler';
import { Alert, AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { palette, radius, shadows, spacing } from '@/theme';

import { courseMessages } from './course-messages';
import { VitaAiAvatar } from './vita-ai-avatar';

const BUTTON_SIZE = 56;
const RING_SIZE = 66;
const RING_RADIUS = 30;
const RING_CENTER = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TAP_MAX_MS = 220;
const ACTIVATE_MS = 1000;
const MAX_GESTURE_DISTANCE = 12;
const MAX_RECORDING_MS = 19_000;
const MAX_AUDIO_BYTES = 1024 * 1024;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type LauncherPhase = 'idle' | 'activating' | 'activated' | 'recording' | 'limited';
type Hold = { session: number };
type Props = {
  visible: boolean;
  route: string;
  bottom: number;
  right: number;
  allowVoice: boolean;
  busy: boolean;
  onOpen: () => void;
  onVoiceRelease: () => boolean;
  onVoiceReady: (file: File) => void;
  onVoiceFailure: () => void;
};

export function removeVoiceFile(uri?: string | null) {
  if (uri) void deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

export function GlobalFloatingLauncher({
  visible, route, bottom, right, allowVoice, busy, onOpen, onVoiceRelease, onVoiceReady, onVoiceFailure,
}: Props) {
  const theme = useTheme();
  const t = useTranslations(courseMessages);
  const tLauncher = useTranslations(launcherMessages);
  const [phase, setPhase] = useState<LauncherPhase>('idle');
  const hold = useRef<Hold | null>(null);
  const consent = useRef(false);
  const preparing = useRef(false);
  const capturing = useRef(false);
  const finishing = useRef(false);
  const mounted = useRef(true);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capStop = useRef<Promise<boolean> | null>(null);
  const resetRecorder = useRef<() => void>(() => undefined);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (event: RecordingStatus) => {
    if (event.hasError || event.mediaServicesDidReset || (event.isFinished && !capStop.current)) {
      resetRecorder.current();
    }
  });

  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const ring = useAnimatedProps(() => ({ strokeDashoffset: (1 - progress.get()) * CIRCUMFERENCE }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.36 * (1 - pulse.get()),
    transform: [{ scale: 1 + 0.28 * pulse.get() }],
  }));

  const resetVisuals = useCallback(() => {
    cancelAnimation(progress);
    progress.set(0);
    cancelAnimation(pulse);
    pulse.set(0);
    if (mounted.current) setPhase('idle');
  }, [progress, pulse]);

  const stopCapture = useCallback(async (released?: Hold) => {
    if (!capturing.current || finishing.current) return;
    finishing.current = true;
    capturing.current = false;
    if (capTimer.current) clearTimeout(capTimer.current);
    capTimer.current = null;
    resetVisuals();
    let transferred = false;
    try {
      const hasAudio = capStop.current ? await capStop.current : await recorder.stop().then(() => true);
      if (!released || !mounted.current || released.session !== getApiSessionGeneration()) return;
      if (!hasAudio || !recorder.uri) throw new Error('Recording did not produce a file');
      const file = new File(recorder.uri);
      if (!file.exists || !file.size || file.size > MAX_AUDIO_BYTES) throw new Error('Invalid recording file');
      onVoiceReady(file);
      transferred = true;
    } catch {
      if (released && mounted.current && released.session === getApiSessionGeneration()) onVoiceFailure();
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      if (!transferred) removeVoiceFile(recorder.uri);
      capStop.current = null;
      finishing.current = false;
    }
  }, [onVoiceFailure, onVoiceReady, recorder, resetVisuals]);

  const cancelHold = useCallback(() => {
    hold.current = null;
    resetVisuals();
    void stopCapture();
  }, [resetVisuals, stopCapture]);

  const activate = async () => {
    const current = hold.current;
    if (!current || preparing.current || capturing.current || finishing.current) return;
    const sameSession = () => mounted.current && current.session === getApiSessionGeneration();
    const stillHeld = () => sameSession() && AppState.currentState === 'active' && hold.current === current;
    if (!stillHeld()) return;
    cancelAnimation(progress);
    progress.set(1);
    setPhase('activated');
    const haptic = Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void haptic.catch(() => undefined);
    if (!consent.current) {
      Alert.alert(t('voiceConsentTitle'), t('voiceConsent'), [
        { text: t('voiceConsentCancel'), style: 'cancel' },
        { text: t('voiceConsentAccept'), onPress: () => { if (sameSession()) consent.current = true; } },
      ]);
      return;
    }

    preparing.current = true;
    let resetAudioMode = false;
    try {
      const permission = await AudioModule.getRecordingPermissionsAsync();
      if (!stillHeld()) return;
      if (!permission.granted) {
        const granted = permission.canAskAgain && (await requestRecordingPermissionsAsync()).granted;
        if (sameSession()) {
          Alert.alert(t('voiceConsentTitle'), granted ? tLauncher('holdAgain') : t('microphoneDenied'));
        }
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      resetAudioMode = true;
      if (!stillHeld()) return;
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      if (!stillHeld()) {
        await recorder.stop().catch(() => undefined);
        removeVoiceFile(recorder.uri);
        return;
      }
      recorder.record();
      if (!recorder.isRecording) throw new Error('Recording did not start');
      capturing.current = true;
      setPhase('recording');
      if (!reducedMotion) {
        pulse.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1));
      }
      capTimer.current = setTimeout(() => {
        if (!capturing.current || capStop.current) return;
        capStop.current = recorder.stop().then(() => true, () => false);
        cancelAnimation(pulse);
        pulse.set(0);
        if (mounted.current) setPhase('limited');
      }, MAX_RECORDING_MS);
    } catch {
      await recorder.stop().catch(() => undefined);
      removeVoiceFile(recorder.uri);
      if (stillHeld()) {
        resetVisuals();
        Alert.alert(t('voiceConsentTitle'), t('voiceUnavailable'));
      }
    } finally {
      if (resetAudioMode && !capturing.current) {
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
      preparing.current = false;
    }
  };

  useEffect(() => {
    resetRecorder.current = () => {
      if (!capturing.current || capStop.current || finishing.current) return;
      cancelHold();
      Alert.alert(t('voiceConsentTitle'), t('voiceUnavailable'));
    };
  }, [cancelHold, t]);

  const cancelLatest = useRef(cancelHold);
  useEffect(() => { cancelLatest.current = cancelHold; }, [cancelHold]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') cancelLatest.current();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      cancelLatest.current();
    };
  }, []);

  useEffect(() => {
    if (!visible) cancelLatest.current();
    return () => cancelLatest.current();
  }, [route, visible]);

  const holdGesture = useLongPressGesture({
    minDuration: ACTIVATE_MS,
    maxDistance: MAX_GESTURE_DISTANCE,
    shouldCancelWhenOutside: true,
    runOnJS: true,
    enabled: visible && allowVoice && !busy,
    onBegin: () => {
      if (preparing.current || finishing.current) return;
      hold.current = { session: getApiSessionGeneration() };
      setPhase('activating');
      if (!reducedMotion) progress.set(withTiming(1, { duration: ACTIVATE_MS, easing: Easing.linear }));
    },
    onActivate: () => { void activate(); },
    onDeactivate: event => {
      const released = hold.current;
      hold.current = null;
      if (event.canceled || !released || released.session !== getApiSessionGeneration()
        || AppState.currentState !== 'active' || !capturing.current) {
        cancelHold();
        return;
      }
      if (!capStop.current && !recorder.isRecording) {
        cancelHold();
        Alert.alert(t('voiceConsentTitle'), t('voiceUnavailable'));
        return;
      }
      void stopCapture(onVoiceRelease() ? released : undefined);
    },
    onFinalize: () => {
      if (hold.current) cancelHold();
    },
  });
  const tapGesture = useTapGesture({
    maxDuration: TAP_MAX_MS,
    maxDistance: MAX_GESTURE_DISTANCE,
    shouldCancelWhenOutside: true,
    runOnJS: true,
    enabled: visible,
    onActivate: onOpen,
  });
  const gesture = useExclusiveGestures(holdGesture, tapGesture);

  if (!visible) return null;
  const recording = phase === 'recording' || phase === 'limited';
  const ringVisible = phase === 'activating' || phase === 'activated';
  const label = phase === 'limited' ? t('voiceLimitReached')
    : recording ? t('voiceRecording') : tLauncher('open');
  const content = <>
    {phase === 'recording' && <Animated.View pointerEvents="none"
      style={[styles.pulse, { backgroundColor: theme.sleep }, pulseStyle]} />}
    {recording
      ? <View style={[styles.recordIcon, { backgroundColor: theme.accent }]}>
        <Svg width={32} height={32} viewBox="0 0 24 24" accessible={false}>
          <Path d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z" fill={theme.onAccent} />
          <Path d="M6 10a6 6 0 0 0 12 0M12 16v4m-3 0h6" stroke={theme.onAccent}
            strokeWidth={1.8} strokeLinecap="round" fill="none" />
        </Svg>
      </View>
      : <VitaAiAvatar size={BUTTON_SIZE} />}
    {ringVisible && <View pointerEvents="none" style={styles.ring} importantForAccessibility="no-hide-descendants">
      <Svg height={RING_SIZE} width={RING_SIZE} accessible={false}>
        <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} stroke={theme.sleepSoft} strokeWidth={3} fill="none" />
        <AnimatedCircle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} stroke={palette.violet[300]} strokeWidth={4}
          strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]} strokeLinecap="round" fill="none"
          rotation={-90} originX={RING_CENTER} originY={RING_CENTER} animatedProps={ring} />
        <Circle cx={RING_CENTER} cy={RING_CENTER - RING_RADIUS} r={2} fill={palette.violet[300]} />
      </Svg>
    </View>}
  </>;
  return <View pointerEvents="box-none" style={[styles.position, { right, bottom }]}>
    {recording && <View pointerEvents="none" accessibilityLiveRegion="polite"
      style={[styles.hint, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText variant="caption">{label}</ThemedText>
    </View>}
    {allowVoice
      ? <GestureDetector gesture={gesture}>
        <View testID="vita-ai-launcher" accessible accessibilityRole="button" accessibilityLabel={label}
          accessibilityHint={busy ? undefined : tLauncher('holdHint')} accessibilityActions={[{ name: 'activate' }]}
          accessibilityState={{ busy }} onAccessibilityTap={onOpen}
          onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') onOpen(); }}
          style={styles.button}>{content}</View>
      </GestureDetector>
      : <Pressable testID="vita-ai-launcher" accessibilityRole="button" accessibilityLabel={label}
        onPress={onOpen} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
        {content}
      </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', alignItems: 'flex-end', zIndex: 20 },
  button: {
    width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', boxShadow: shadows.floating,
  },
  ring: { position: 'absolute', top: (BUTTON_SIZE - RING_SIZE) / 2, left: (BUTTON_SIZE - RING_SIZE) / 2 },
  pulse: { ...StyleSheet.absoluteFill, borderRadius: radius.full },
  recordIcon: { ...StyleSheet.absoluteFill, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  hint: {
    maxWidth: 220, marginBottom: spacing.sm, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: radius.md, boxShadow: shadows.card,
  },
});

const launcherMessages = {
  en: { open: 'Open Vita AI', holdHint: 'Touch and hold to record a request.', holdAgain: 'Touch and hold Vita AI again to record.' },
  vi: { open: 'Mở Vita AI', holdHint: 'Nhấn giữ để ghi âm yêu cầu.', holdAgain: 'Nhấn giữ Vita AI lần nữa để ghi âm.' },
} as const;
