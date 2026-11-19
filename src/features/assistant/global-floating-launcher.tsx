import { AudioModule, type RecordingStatus, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { palette, radius, shadows, spacing } from '@/theme';

import { courseMessages } from './course-messages';
import { LAUNCHER_GESTURE_CONFIG, createLauncherGestureState, reduceLauncherGesture,
  type LauncherGestureEvent, type LauncherGestureState, type LauncherGestureAction } from './launcher-gesture-machine';
import { LAUNCHER_LAYOUT, type LauncherPosition } from './launcher-layout';
import { VitaAiAvatar } from './vita-ai-avatar';
import { acceptAssistantVoiceConsent, hasAssistantVoiceConsent } from './assistant-voice-consent';
import { removeVoiceFile } from './assistant-voice-files';

const BUTTON_SIZE = LAUNCHER_LAYOUT.buttonSize;
const RING_SIZE = 66;
const RING_RADIUS = 30;
const RING_CENTER = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAX_RECORDING_MS = 19_000;
const MAX_AUDIO_BYTES = 1024 * 1024;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const activationGlow = require('../../../assets/assistant/vita-ai-activation-glow.png');

type Hold = { session: number; touchId: number };
type TouchOrigin = { touchId: number; x: number; y: number; left: number; top: number };
type Props = {
  visible: boolean;
  route: string;
  allowVoice: boolean;
  busy: boolean;
  position: LauncherPosition;
  coordinateOrigin: { x: number; y: number };
  hintAlignment: 'left' | 'center' | 'right';
  hintMaxWidth: number;
  onPositionChange: (position: LauncherPosition) => void;
  onOpen: () => void;
  onVoiceRelease: () => boolean;
  onVoiceReady: (file: File) => void;
  onVoiceFailure: () => void;
};

export function GlobalFloatingLauncher({
  visible, route, allowVoice, busy, position, coordinateOrigin, hintAlignment, hintMaxWidth, onPositionChange, onOpen, onVoiceRelease, onVoiceReady, onVoiceFailure,
}: Props) {
  const theme = useTheme();
  const t = useTranslations(courseMessages);
  const tLauncher = useTranslations(launcherMessages);
  const [phase, setPhase] = useState<LauncherGestureState['phase']>('idle');
  const machine = useRef(createLauncherGestureState());
  const touchOrigin = useRef<TouchOrigin | null>(null);
  const hold = useRef<Hold | null>(null);
  const preparing = useRef(false);
  const capturing = useRef(false);
  const finishing = useRef(false);
  const mounted = useRef(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capStop = useRef<Promise<boolean> | null>(null);
  const resetRecorder = useRef<() => void>(() => undefined);
  const dispatchRef = useRef<(event: LauncherGestureEvent) => void>(() => undefined);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (event: RecordingStatus) => {
    if (event.hasError || event.mediaServicesDidReset || (event.isFinished && !capStop.current)) {
      resetRecorder.current();
    }
  });

  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const ring = useAnimatedProps(() => ({ strokeDashoffset: (1 - progress.get()) * CIRCUMFERENCE }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.36 * (1 - pulse.get()),
    transform: [{ scale: 1 + 0.28 * pulse.get() }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.72 : 0.5 + 0.28 * glow.get(),
    transform: [{ scale: 1 + (reducedMotion ? 0 : 0.06 * glow.get()) }],
  }), [reducedMotion]);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (ringTimer.current) clearTimeout(ringTimer.current);
    holdTimer.current = null;
    ringTimer.current = null;
  }, []);

  const clearAnimations = useCallback(() => {
    cancelAnimation(progress);
    progress.set(0);
    cancelAnimation(pulse);
    pulse.set(0);
    cancelAnimation(glow);
    glow.set(0);
  }, [glow, progress, pulse]);

  const resetVisuals = useCallback(() => {
    clearAnimations();
    if (mounted.current) setPhase('idle');
  }, [clearAnimations]);

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

  const startRing = useCallback((touchId: number) => {
    cancelAnimation(progress);
    progress.set(reducedMotion ? 0 : withTiming(1, {
      duration: LAUNCHER_GESTURE_CONFIG.activationRingMs,
      easing: Easing.linear,
    }));
    ringTimer.current = setTimeout(() => {
      const current = hold.current;
      if (current?.touchId !== touchId) return;
      dispatchRef.current(current.session === getApiSessionGeneration()
        ? { type: 'ring-complete', touchId }
        : { type: 'cancel', touchId });
    }, LAUNCHER_GESTURE_CONFIG.activationRingMs);
  }, [progress, reducedMotion]);

  const activate = useCallback(async () => {
    const current = hold.current;
    if (!current || preparing.current || capturing.current || finishing.current) return;
    const sameSession = () => mounted.current && current.session === getApiSessionGeneration();
    const stillHeld = () => sameSession() && AppState.currentState === 'active' && hold.current === current;
    if (!stillHeld()) return;
    progress.set(1);
    cancelAnimation(glow);
    if (!reducedMotion) glow.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
    if (!hasAssistantVoiceConsent()) {
      Alert.alert(t('voiceConsentTitle'), t('voiceConsent'), [
        { text: t('voiceConsentCancel'), style: 'cancel' },
        { text: t('voiceConsentAccept'), onPress: () => { if (sameSession()) acceptAssistantVoiceConsent(); } },
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
        if (sameSession()) Alert.alert(t('voiceConsentTitle'), granted ? tLauncher('holdAgain') : t('microphoneDenied'));
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
      dispatchRef.current({ type: 'recording-started', touchId: current.touchId });
      if (!reducedMotion) pulse.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1));
      capTimer.current = setTimeout(() => {
        if (!capturing.current || capStop.current) return;
        capStop.current = recorder.stop().then(() => true, () => false);
        cancelAnimation(pulse);
        pulse.set(0);
        dispatchRef.current({ type: 'recording-limited', touchId: current.touchId });
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
  }, [glow, progress, pulse, reducedMotion, recorder, resetVisuals, t, tLauncher]);

  const runGestureActions = useCallback((actions: LauncherGestureAction[], touchId: number) => {
    for (const action of actions) {
      if (action === 'start-hold-timer') {
        if (!allowVoice || busy) continue;
        hold.current = { session: getApiSessionGeneration(), touchId };
        const session = hold.current?.session;
        holdTimer.current = setTimeout(() => {
          const current = hold.current;
          if (current?.touchId !== touchId) return;
          dispatchRef.current(current.session === session && session === getApiSessionGeneration()
            ? { type: 'hold-delay', touchId }
            : { type: 'cancel', touchId });
        }, LAUNCHER_GESTURE_CONFIG.touchPendingMs);
      } else if (action === 'start-ring-timer') {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = null;
        startRing(touchId);
      } else if (action === 'light-haptic') {
        if (!hold.current || hold.current.session !== getApiSessionGeneration()) continue;
        const haptic = Platform.OS === 'android'
          ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        void haptic.catch(() => undefined);
      } else if (action === 'activate-voice') {
        void activate();
      } else if (action === 'cancel-hold') {
        clearTimers();
        hold.current = null;
        clearAnimations();
        void stopCapture();
      } else if (action === 'open-chat') {
        clearTimers();
        hold.current = null;
        clearAnimations();
        onOpen();
      } else if (action === 'finish-recording') {
        clearTimers();
        const released = hold.current;
        hold.current = null;
        const handoff = released?.session === getApiSessionGeneration() && onVoiceRelease();
        void stopCapture(handoff ? released : undefined);
      }
    }
  }, [activate, allowVoice, busy, clearAnimations, clearTimers, onOpen, onVoiceRelease, startRing, stopCapture]);

  const dispatchGesture = useCallback((event: LauncherGestureEvent) => {
    const result = reduceLauncherGesture(machine.current, event);
    machine.current = result.state;
    if (mounted.current) setPhase(result.state.phase);
    runGestureActions(result.actions, event.touchId);
  }, [runGestureActions]);
  useEffect(() => { dispatchRef.current = dispatchGesture; }, [dispatchGesture]);

  const cancelHold = useCallback(() => {
    const touchId = machine.current.touchId;
    if (touchId !== null) dispatchRef.current({ type: 'cancel', touchId });
    else {
      clearTimers();
      hold.current = null;
      clearAnimations();
      void stopCapture();
    }
  }, [clearAnimations, clearTimers, stopCapture]);

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

  const gesture = usePanGesture({
    minDistance: LAUNCHER_GESTURE_CONFIG.dragThresholdDp,
    shouldCancelWhenOutside: false,
    runOnJS: true,
    enabled: visible,
    onTouchesDown: event => {
      if (event.numberOfTouches !== 1) {
        const touchId = machine.current.touchId;
        if (touchId !== null) dispatchGesture({ type: 'cancel', touchId });
        touchOrigin.current = null;
        return;
      }
      if (machine.current.phase !== 'idle') return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      touchOrigin.current = {
        touchId: touch.id,
        x: touch.absoluteX,
        y: touch.absoluteY,
        left: position.left,
        top: position.top,
      };
      dispatchGesture({ type: 'down', touchId: touch.id });
    },
    onTouchesMove: event => {
      const start = touchOrigin.current;
      const touch = event.allTouches.find(item => item.id === start?.touchId);
      if (!start || !touch) return;
      if (event.numberOfTouches !== 1) {
        dispatchGesture({ type: 'cancel', touchId: start.touchId });
        touchOrigin.current = null;
        return;
      }
      const distanceDp = Math.hypot(touch.absoluteX - start.x, touch.absoluteY - start.y);
      dispatchGesture({ type: 'move', touchId: start.touchId, distanceDp });
      if (machine.current.phase === 'dragging') {
        onPositionChange({
          left: touch.absoluteX - coordinateOrigin.x - (start.x - coordinateOrigin.x - start.left),
          top: touch.absoluteY - coordinateOrigin.y - (start.y - coordinateOrigin.y - start.top),
        });
      }
    },
    onTouchesUp: event => {
      const start = touchOrigin.current;
      if (!start || !event.changedTouches.some(item => item.id === start.touchId)) return;
      dispatchGesture({ type: 'release', touchId: start.touchId });
      touchOrigin.current = null;
    },
    onTouchesCancel: () => {
      const touchId = machine.current.touchId;
      if (touchId !== null) dispatchGesture({ type: 'cancel', touchId });
      touchOrigin.current = null;
    },
  });

  if (!visible) return null;
  const recording = phase === 'recording' || phase === 'limited';
  const ringVisible = phase === 'ringing' || phase === 'activated';
  const label = phase === 'limited' ? t('voiceLimitReached')
    : recording ? t('voiceRecording') : tLauncher('open');
  const hintStyle = hintAlignment === 'left' ? styles.hintLeft
    : hintAlignment === 'right' ? styles.hintRight : styles.hintCenter;
  const content = <>
    {phase === 'activated' && <Animated.Image source={activationGlow} resizeMode="contain"
      pointerEvents="none" style={[styles.glow, glowStyle]} />}
    {recording && <Animated.View pointerEvents="none"
      style={[styles.pulse, { backgroundColor: theme.sleep }, pulseStyle]} />}
    <VitaAiAvatar size={BUTTON_SIZE} variant={recording ? 'recording' : phase === 'activated' ? 'activated' : 'idle'} />
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
  return <View pointerEvents="box-none" style={[styles.position, { left: position.left, top: position.top }]}>
    {recording && <View pointerEvents="none" accessibilityLiveRegion="polite"
      style={[styles.hint, hintStyle,
        { backgroundColor: theme.backgroundElement, maxWidth: hintMaxWidth }]}>
      <ThemedText variant="caption">{label}</ThemedText>
    </View>}
    <GestureDetector gesture={gesture}>
      <View testID="vita-ai-launcher" accessible accessibilityRole="button" accessibilityLabel={label}
        accessibilityHint={busy ? undefined : tLauncher('holdHint')} accessibilityActions={[{ name: 'activate' }]}
        accessibilityState={{ busy }} onAccessibilityTap={onOpen}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') onOpen(); }}
        style={styles.button}>{content}</View>
    </GestureDetector>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', alignItems: 'center', zIndex: 20 },
  button: {
    width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', boxShadow: shadows.floating,
  },
  ring: { position: 'absolute', top: (BUTTON_SIZE - RING_SIZE) / 2, left: (BUTTON_SIZE - RING_SIZE) / 2 },
  glow: { position: 'absolute', width: 80, height: 54 },
  pulse: { ...StyleSheet.absoluteFill, borderRadius: radius.full },
  hint: {
    position: 'absolute', bottom: BUTTON_SIZE + LAUNCHER_LAYOUT.hintGap,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md,
    boxShadow: shadows.card,
  },
  hintLeft: { left: 0 },
  hintCenter: { alignSelf: 'center' },
  hintRight: { right: 0 },
});

const launcherMessages = {
  en: { open: 'Open Vita AI', holdHint: 'Touch and hold to record a request.', holdAgain: 'Touch and hold Vita AI again to record.' },
  vi: { open: 'Mở Vita AI', holdHint: 'Nhấn giữ để ghi âm yêu cầu.', holdAgain: 'Nhấn giữ Vita AI lần nữa để ghi âm.' },
} as const;
