import type { File } from 'expo-file-system';
import { usePathname, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Keyboard, Platform, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMainTabBarHeight, MAIN_TAB_BAR_HEIGHT, subscribeMainTabBarHeight } from '@/components/ui/main-tab-bar';
import { useScreenOverlayBlocked } from '@/components/ui/screen-overlay-context';
import { getApiSessionGeneration } from '@/lib/api/http-client';
import { AssistantConversationSheet } from './assistant-conversation-sheet';
import { useAssistantAccess } from './assistant-access-provider';
import { createTurnId } from './assistant-api';
import { GlobalFloatingLauncher, removeVoiceFile } from './global-floating-launcher';
import { clampLauncherPosition, defaultLauncherPosition, getLauncherHintAlignment, LAUNCHER_LAYOUT,
  type LauncherPosition } from './launcher-layout';
import { useAssistantConversation } from './use-assistant-conversation';

const MAIN_ROUTES = new Set(['/home', '/statistics', '/profile', '/sleep', '/water', '/steps', '/heart-rate']);
const voiceEnabled = Platform.OS !== 'web'
  && process.env.EXPO_PUBLIC_ASSISTANT_VOICE === 'true';

type PendingAudio = { file: File; turnId: string; session: number };
type OpenAssistant = { route: string; accessVersion: number };
type OverlayViewport = LayoutRectangle & { originX: number; originY: number };

export function GlobalAssistant() {
  const access = useAssistantAccess();
  const assistantAllowed = access.status === 'ready' && access.personalDataAllowed;
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const blockingOverlay = useScreenOverlayBlocked();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible?.() ?? false);
  const [openAssistant, setOpenAssistant] = useState<OpenAssistant>();
  const [viewport, setViewport] = useState<OverlayViewport>({ x: 0, y: 0, width: 0, height: 0, originX: 0, originY: 0 });
  const measuredTabBarHeight = useSyncExternalStore(subscribeMainTabBarHeight, getMainTabBarHeight, () => undefined);
  const [savedPosition, setSavedPosition] = useState<LauncherPosition>();
  const audio = useRef<PendingAudio | undefined>(undefined);
  const recordingSession = useRef<number | undefined>(undefined);
  const conversation = useAssistantConversation(assistantAllowed);
  const { beginVoice, submitVoice, failVoice, dismissVoiceError, voiceError, reset } = conversation;
  const eligible = MAIN_ROUTES.has(pathname);
  const open = eligible && assistantAllowed && openAssistant?.route === pathname
    && openAssistant.accessVersion === access.version;
  const inTabs = segments[0] === '(tabs)';

  if (openAssistant && openAssistant.route !== pathname) setOpenAssistant(undefined);

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

  useEffect(() => {
    if (assistantAllowed) return;
    recordingSession.current = undefined;
    clearAudio();
    reset();
  }, [assistantAllowed, clearAudio, reset]);

  const tabBarHeight = inTabs ? measuredTabBarHeight ?? MAIN_TAB_BAR_HEIGHT + insets.bottom : 0;
  const positionBounds = useMemo(() => ({
    width: viewport.width,
    height: viewport.height,
    insets: { top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left },
    tabBarHeight,
  }), [viewport.width, viewport.height, insets.top, insets.right, insets.bottom, insets.left, tabBarHeight]);
  const initialPosition = useMemo(() => defaultLauncherPosition(positionBounds), [positionBounds]);
  const launcherPosition = clampLauncherPosition(savedPosition ?? initialPosition, positionBounds);
  const hintAlignment = getLauncherHintAlignment(launcherPosition, viewport.width,
    { left: insets.left, right: insets.right });
  const hintMaxWidth = Math.min(220, Math.max(LAUNCHER_LAYOUT.buttonSize, viewport.width - insets.left - insets.right));

  const updateLauncherPosition = useCallback((position: LauncherPosition) => {
    setSavedPosition(clampLauncherPosition(position, positionBounds));
  }, [positionBounds]);

  const showSheet = () => {
    if (!eligible) return;
    setOpenAssistant({ route: pathname, accessVersion: access.version });
  };

  const discardVoiceError = () => {
    clearAudio();
    dismissVoiceError();
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    setOpenAssistant(undefined);
    if (!conversation.busy && voiceError) discardVoiceError();
  };

  const handleVoiceRelease = () => {
    if (!assistantAllowed || !eligible || blockingOverlay || keyboardVisible || open || !beginVoice()) return false;
    clearAudio();
    recordingSession.current = getApiSessionGeneration();
    setOpenAssistant({ route: pathname, accessVersion: access.version });
    return true;
  };

  const sendAudio = useCallback(async (pending: PendingAudio) => {
    if (pending.session !== getApiSessionGeneration()) return;
    if (await submitVoice(pending.file, pending.turnId) && audio.current === pending) clearAudio();
  }, [clearAudio, submitVoice]);

  const handleVoiceReady = useCallback((file: File) => {
    const session = recordingSession.current;
    recordingSession.current = undefined;
    if (!assistantAllowed || session === undefined || session !== getApiSessionGeneration()) {
      removeVoiceFile(file.uri);
      return;
    }
    const pending = { session, file, turnId: createTurnId() };
    audio.current = pending;
    void sendAudio(pending);
  }, [assistantAllowed, sendAudio]);

  const handleVoiceFailure = useCallback(() => {
    recordingSession.current = undefined;
    failVoice();
  }, [failVoice]);

  if (!assistantAllowed) return null;

  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}
    onLayout={event => {
      const { x, y, width, height } = event.nativeEvent.layout;
      setViewport(current => ({ ...current, x, y, width, height, originX: x, originY: y }));
    }}>
    <GlobalFloatingLauncher visible={eligible && viewport.width > 0 && !open && !blockingOverlay && !keyboardVisible}
      route={pathname} allowVoice={voiceEnabled} busy={conversation.busy || !!voiceError?.retryable}
      position={launcherPosition} coordinateOrigin={{ x: viewport.originX, y: viewport.originY }}
      hintAlignment={hintAlignment} hintMaxWidth={hintMaxWidth}
      onPositionChange={updateLauncherPosition} onOpen={showSheet} onVoiceRelease={handleVoiceRelease}
      onVoiceReady={handleVoiceReady} onVoiceFailure={handleVoiceFailure} />
    <AssistantConversationSheet visible={open} onClose={closeSheet}
      conversation={conversation} onDismissVoiceError={discardVoiceError}
      onRetryVoice={() => { if (audio.current && beginVoice()) void sendAudio(audio.current); }} />
  </View>;
}
