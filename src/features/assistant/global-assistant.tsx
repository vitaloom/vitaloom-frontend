import type { File } from 'expo-file-system';
import { router, usePathname, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAIN_TAB_BAR_HEIGHT } from '@/components/ui/main-tab-bar';
import { useScreenOverlayBlocked } from '@/components/ui/screen-overlay-context';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { spacing } from '@/theme';

import { AssistantConversationSheet } from './assistant-conversation-sheet';
import { createTurnId } from './assistant-api';
import { assistantCourseEnabled } from './assistant-course-api';
import { GlobalFloatingLauncher, removeVoiceFile } from './global-floating-launcher';
import { useAssistantConversation } from './use-assistant-conversation';

const MAIN_ROUTES = new Set(['/home', '/statistics', '/profile', '/sleep', '/water', '/steps', '/heart-rate']);
const voiceEnabled = Platform.OS !== 'web' && assistantCourseEnabled
  && process.env.EXPO_PUBLIC_ASSISTANT_VOICE === 'true';

type PendingAudio = { file: File; turnId: string; session: number };

export function GlobalAssistant() {
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const blockingOverlay = useScreenOverlayBlocked();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible?.() ?? false);
  const [openPath, setOpenPath] = useState<string>();
  const audio = useRef<PendingAudio | undefined>(undefined);
  const recordingSession = useRef<number | undefined>(undefined);
  const conversation = useAssistantConversation();
  const { beginVoice, submitVoice, failVoice, dismissVoiceError, voiceError } = conversation;
  const eligible = MAIN_ROUTES.has(pathname);
  const open = eligible && openPath === pathname;

  if (openPath && openPath !== pathname) setOpenPath(undefined);

  const clearAudio = useCallback(() => {
    removeVoiceFile(audio.current?.file.uri);
    audio.current = undefined;
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => () => {
    recordingSession.current = undefined;
    clearAudio();
  }, [clearAudio]);

  const showSheet = () => {
    if (!eligible) return;
    if (assistantCourseEnabled) setOpenPath(pathname);
    else router.push('/assistant');
  };

  const discardVoiceError = () => {
    clearAudio();
    dismissVoiceError();
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    setOpenPath(undefined);
    if (!conversation.busy && voiceError) discardVoiceError();
  };

  const handleVoiceRelease = () => {
    if (!eligible || blockingOverlay || keyboardVisible || open || !beginVoice()) return false;
    clearAudio();
    recordingSession.current = getApiSessionGeneration();
    setOpenPath(pathname);
    return true;
  };

  const sendAudio = useCallback(async (pending: PendingAudio) => {
    if (pending.session !== getApiSessionGeneration()) return;
    if (await submitVoice(pending.file, pending.turnId) && audio.current === pending) clearAudio();
  }, [clearAudio, submitVoice]);

  const handleVoiceReady = useCallback((file: File) => {
    const session = recordingSession.current;
    recordingSession.current = undefined;
    if (session === undefined || session !== getApiSessionGeneration()) {
      removeVoiceFile(file.uri);
      return;
    }
    const pending = { session, file, turnId: createTurnId() };
    audio.current = pending;
    void sendAudio(pending);
  }, [sendAudio]);

  const handleVoiceFailure = useCallback(() => {
    recordingSession.current = undefined;
    failVoice();
  }, [failVoice]);

  return <>
    <GlobalFloatingLauncher visible={eligible && !open && !blockingOverlay && !keyboardVisible}
      route={pathname} allowVoice={voiceEnabled} busy={conversation.busy || !!voiceError?.retryable}
      bottom={Math.max(insets.bottom, spacing.md) + spacing.sm + (segments[0] === '(tabs)' ? MAIN_TAB_BAR_HEIGHT : 0)}
      right={Math.max(insets.right, spacing.md)} onOpen={showSheet} onVoiceRelease={handleVoiceRelease}
      onVoiceReady={handleVoiceReady} onVoiceFailure={handleVoiceFailure} />
    {assistantCourseEnabled && <AssistantConversationSheet visible={open} onClose={closeSheet}
      conversation={conversation} onDismissVoiceError={discardVoiceError}
      onRetryVoice={() => { if (audio.current && beginVoice()) void sendAudio(audio.current); }} />}
  </>;
}
