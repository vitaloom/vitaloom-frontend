import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslations } from '@/i18n';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { radius, sizing, spacing } from '@/theme';

import { assistantUiMessages } from './assistant-ui-messages';
import { courseMessages } from './course-messages';
import { acceptAssistantVoiceConsent, hasAssistantVoiceConsent } from './assistant-voice-consent';
import { removeVoiceFile } from './assistant-voice-files';
import { VitaAiAvatar } from './vita-ai-avatar';

const MAX_RECORDING_MS = 19_000;
const MAX_AUDIO_BYTES = 1024 * 1024;

export function AssistantVoiceInput({ disabled, holdToRecord = false, onStart, onReady, onFailure,
  onCancel = onFailure }: {
  disabled: boolean;
  holdToRecord?: boolean;
  onStart: () => boolean;
  onReady: (file: File) => void;
  onFailure: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations(assistantUiMessages);
  const course = useTranslations(courseMessages);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sessionGeneration = getApiSessionGeneration();
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [awaitingRelease, setAwaitingRelease] = useState(false);
  const alive = useRef(true);
  const holding = useRef(false);
  const queuedAudio = useRef<File | undefined>(undefined);
  const preparingRef = useRef(false);
  const recordingRef = useRef(false);
  const stoppingRef = useRef(false);
  const session = useRef<number | undefined>(undefined);
  const operation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacks = useRef({ onCancel, onFailure, onReady });

  useEffect(() => {
    callbacks.current = { onCancel, onFailure, onReady };
  }, [onCancel, onFailure, onReady]);

  const cancel = useCallback(() => {
    const shouldNotify = session.current !== undefined;
    const preparationPending = preparingRef.current;
    const wasRecording = recordingRef.current;
    holding.current = false;
    if (queuedAudio.current) removeVoiceFile(queuedAudio.current.uri);
    queuedAudio.current = undefined;
    operation.current += 1;
    recordingRef.current = false;
    session.current = undefined;
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    if (!preparationPending) preparingRef.current = false;
    if (alive.current && !preparationPending) setPreparing(false);
    if (alive.current) {
      setRecording(false);
      setAwaitingRelease(false);
    }
    if (wasRecording) {
      stoppingRef.current = true;
      void recorder.stop().catch(() => undefined).then(async () => {
        removeVoiceFile(recorder.uri);
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
        stoppingRef.current = false;
      });
    }
    if (shouldNotify) callbacks.current.onCancel();
  }, [recorder]);

  const finishPreparation = useCallback(async (currentOperation: number) => {
    await recorder.stop().catch(() => undefined);
    removeVoiceFile(recorder.uri);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    preparingRef.current = false;
    session.current = undefined;
    if (alive.current) setPreparing(false);
    if (currentOperation === operation.current) {
      holding.current = false;
      operation.current += 1;
      if (alive.current) callbacks.current.onFailure();
    }
  }, [recorder]);

  useEffect(() => {
    if (session.current !== undefined && session.current !== sessionGeneration) cancel();
  }, [cancel, sessionGeneration]);

  async function begin() {
    if (disabled || preparingRef.current || stoppingRef.current || session.current !== undefined) return;
    const currentSession = getApiSessionGeneration();
    if (!hasAssistantVoiceConsent()) {
      Alert.alert(course('voiceConsentTitle'), course('voiceConsent'), [
        { text: course('voiceConsentCancel'), style: 'cancel' },
        { text: course('voiceConsentAccept'), onPress: () => {
          if (currentSession === getApiSessionGeneration()) acceptAssistantVoiceConsent();
        } },
      ]);
      return;
    }
    if (!onStart()) return;
    preparingRef.current = true;
    setPreparing(true);
    session.current = currentSession;
    const currentOperation = ++operation.current;
    const active = () => alive.current && currentOperation === operation.current
      && currentSession === getApiSessionGeneration() && AppState.currentState === 'active';
    try {
      const permission = await AudioModule.getRecordingPermissionsAsync();
      if (!active()) {
        await finishPreparation(currentOperation);
        return;
      }
      if (!permission.granted) {
        const requested = permission.canAskAgain ? await requestRecordingPermissionsAsync() : undefined;
        if (!active()) {
          await finishPreparation(currentOperation);
          return;
        }
        if (!requested?.granted) {
          Alert.alert(course('voiceConsentTitle'), course('microphoneDenied'));
          await finishPreparation(currentOperation);
          return;
        }
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!active()) {
        await finishPreparation(currentOperation);
        return;
      }
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      if (!active()) {
        await finishPreparation(currentOperation);
        return;
      }
      recorder.record();
      preparingRef.current = false;
      setPreparing(false);
      recordingRef.current = true;
      setRecording(true);
      timer.current = setTimeout(() => { void finish(); }, MAX_RECORDING_MS);
    } catch {
      await finishPreparation(currentOperation);
    }
  }

  const finish = useCallback(async () => {
    if (!recordingRef.current) return;
    const currentOperation = operation.current;
    const currentSession = session.current;
    recordingRef.current = false;
    stoppingRef.current = true;
    setRecording(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    try {
      await recorder.stop();
      if (currentOperation !== operation.current || currentSession !== getApiSessionGeneration()
          || AppState.currentState !== 'active' || !recorder.uri || !alive.current) {
        removeVoiceFile(recorder.uri);
        if (alive.current && currentOperation === operation.current) {
          holding.current = false;
          callbacks.current.onFailure();
        }
        return;
      }
      const file = new File(recorder.uri);
      if (!file.exists || !file.size || file.size > MAX_AUDIO_BYTES) throw new Error('Invalid recording file');
      if (holdToRecord && holding.current) {
        queuedAudio.current = file;
        setAwaitingRelease(true);
      } else {
        callbacks.current.onReady(file);
      }
    } catch {
      removeVoiceFile(recorder.uri);
      if (alive.current && currentOperation === operation.current) {
        holding.current = false;
        callbacks.current.onFailure();
      }
    } finally {
      if (currentOperation === operation.current && !queuedAudio.current) session.current = undefined;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      stoppingRef.current = false;
    }
  }, [holdToRecord, recorder]);

  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') cancel();
    });
    return () => {
      alive.current = false;
      subscription.remove();
      cancel();
    };
  }, [cancel]);

  const startHold = () => {
    holding.current = true;
    void begin();
  };

  const releaseHold = () => {
    if (!holding.current) return;
    holding.current = false;
    if (queuedAudio.current) {
      if (session.current !== getApiSessionGeneration() || AppState.currentState !== 'active') {
        cancel();
        return;
      }
      const file = queuedAudio.current;
      queuedAudio.current = undefined;
      session.current = undefined;
      setAwaitingRelease(false);
      callbacks.current.onReady(file);
    } else if (preparingRef.current) {
      cancel();
    } else {
      void finish();
    }
  };

  if (holdToRecord) {
    const active = preparing || recording || awaitingRelease;
    return <View accessible accessibilityRole="button"
      accessibilityLabel={recording || awaitingRelease ? course('voiceRecording') : t('voiceHold')}
      accessibilityHint={t('voiceHoldAccessibility')}
      accessibilityState={{ disabled: disabled && !active, busy: preparing }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName !== 'activate') return;
        if (holding.current) releaseHold();
        else if (!disabled) startHold();
      }}
      onStartShouldSetResponder={() => !disabled && !preparingRef.current && !stoppingRef.current
        && session.current === undefined}
      onResponderGrant={startHold} onResponderRelease={releaseHold} onResponderTerminate={cancel}
      style={{ width: sizing.controlComfortable, height: sizing.controlComfortable, alignItems: 'center',
        justifyContent: 'center', borderRadius: radius.full, opacity: active ? 0.7 : disabled ? 0.45 : 1 }}>
      <VitaAiAvatar size={sizing.controlComfortable} variant="recording" />
    </View>;
  }

  return <Pressable accessibilityRole="button" accessibilityLabel={recording ? t('voiceSend') : preparing ? t('processing') : t('voiceRecord')}
    disabled={(disabled && !recording) || preparing} onPress={() => recording ? void finish() : void begin()}
    style={({ pressed }) => ({ minWidth: sizing.controlComfortable, height: sizing.controlComfortable,
      alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, paddingHorizontal: spacing.sm,
      opacity: pressed ? 0.72 : 1 })}>
    <ThemedText themeColor="accent" variant="labelStrong">{recording ? t('voiceSend') : preparing ? t('processing') : t('voiceRecord')}</ThemedText>
  </Pressable>;
}
