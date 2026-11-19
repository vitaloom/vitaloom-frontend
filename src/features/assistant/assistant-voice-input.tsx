import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslations } from '@/i18n';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { radius, sizing, spacing } from '@/theme';

import { assistantUiMessages } from './assistant-ui-messages';
import { courseMessages } from './course-messages';
import { acceptAssistantVoiceConsent, hasAssistantVoiceConsent } from './assistant-voice-consent';
import { removeVoiceFile } from './assistant-voice-files';

const MAX_RECORDING_MS = 19_000;
const MAX_AUDIO_BYTES = 1024 * 1024;

export function AssistantVoiceInput({ disabled, onStart, onReady, onFailure }: {
  disabled: boolean;
  onStart: () => boolean;
  onReady: (file: File) => void;
  onFailure: () => void;
}) {
  const t = useTranslations(assistantUiMessages);
  const course = useTranslations(courseMessages);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sessionGeneration = getApiSessionGeneration();
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const alive = useRef(true);
  const preparingRef = useRef(false);
  const recordingRef = useRef(false);
  const session = useRef<number | undefined>(undefined);
  const operation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacks = useRef({ onFailure, onReady });

  useEffect(() => {
    callbacks.current = { onFailure, onReady };
  }, [onFailure, onReady]);

  const cancel = useCallback(() => {
    const shouldNotify = preparingRef.current || recordingRef.current || session.current !== undefined;
    const preparationPending = preparingRef.current;
    operation.current += 1;
    recordingRef.current = false;
    session.current = undefined;
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    if (!preparationPending) preparingRef.current = false;
    if (alive.current && !preparationPending) setPreparing(false);
    if (alive.current) setRecording(false);
    if (shouldNotify && !preparationPending) {
      void recorder.stop().catch(() => undefined).finally(() => {
        removeVoiceFile(recorder.uri);
        void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      });
    }
    if (shouldNotify) callbacks.current.onFailure();
  }, [recorder]);

  const finishPreparation = useCallback(async (currentOperation: number) => {
    await recorder.stop().catch(() => undefined);
    removeVoiceFile(recorder.uri);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    preparingRef.current = false;
    session.current = undefined;
    if (alive.current) setPreparing(false);
    if (currentOperation === operation.current) {
      operation.current += 1;
      if (alive.current) callbacks.current.onFailure();
    }
  }, [recorder]);

  useEffect(() => {
    if (session.current !== undefined && session.current !== sessionGeneration) cancel();
  }, [cancel, sessionGeneration]);

  async function begin() {
    if (disabled || preparingRef.current || recordingRef.current) return;
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
      timer.current = setTimeout(() => { void finish(true); }, MAX_RECORDING_MS);
    } catch {
      await finishPreparation(currentOperation);
    }
  }

  const finish = useCallback(async (submit: boolean) => {
    if (!recordingRef.current) return;
    const currentOperation = operation.current;
    const currentSession = session.current;
    recordingRef.current = false;
    setRecording(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    try {
      await recorder.stop();
      if (!submit || currentOperation !== operation.current || currentSession !== getApiSessionGeneration()
          || !recorder.uri || !alive.current) {
        removeVoiceFile(recorder.uri);
        if (alive.current && currentOperation === operation.current) callbacks.current.onFailure();
        return;
      }
      const file = new File(recorder.uri);
      if (!file.exists || !file.size || file.size > MAX_AUDIO_BYTES) throw new Error('Invalid recording file');
      callbacks.current.onReady(file);
    } catch {
      removeVoiceFile(recorder.uri);
      if (alive.current && currentOperation === operation.current) callbacks.current.onFailure();
    } finally {
      if (currentOperation === operation.current) session.current = undefined;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  }, [recorder]);

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

  return <Pressable accessibilityRole="button" accessibilityLabel={recording ? t('voiceSend') : preparing ? t('processing') : t('voiceRecord')}
    disabled={(disabled && !recording) || preparing} onPress={() => recording ? void finish(true) : void begin()}
    style={({ pressed }) => ({ minWidth: sizing.controlComfortable, height: sizing.controlComfortable,
      alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, paddingHorizontal: spacing.sm,
      opacity: pressed ? 0.72 : 1 })}>
    <ThemedText themeColor="accent" variant="labelStrong">{recording ? t('voiceSend') : preparing ? t('processing') : t('voiceRecord')}</ThemedText>
  </Pressable>;
}
