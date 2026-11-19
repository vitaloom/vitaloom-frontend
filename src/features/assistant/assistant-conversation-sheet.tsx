import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { ComponentRef } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslations } from '@/i18n';
import { radius, shadows, sizing, spacing } from '@/theme';

import { assistantUiMessages } from './assistant-ui-messages';
import { VitaAiAvatar } from './vita-ai-avatar';
import type { useAssistantConversation } from './use-assistant-conversation';

type ConversationController = ReturnType<typeof useAssistantConversation>;

export function AssistantConversationSheet({ visible, onClose, conversation, onRetryVoice, onDismissVoiceError }: {
  visible: boolean;
  onClose: () => void;
  conversation: ConversationController;
  onRetryVoice: () => void;
  onDismissVoiceError: () => void;
}) {
  const theme = useTheme();
  const t = useTranslations(assistantUiMessages);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (visible) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
  }, [visible]);

  useEffect(() => {
    if (visible) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  }, [conversation.busy, conversation.messages.length, visible]);

  useEffect(() => {
    const subscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })));
    return () => subscription.remove();
  }, []);

  const messageStyle = (role: 'user' | 'assistant') => ({
    maxWidth: '86%' as const,
    alignSelf: role === 'user' ? 'flex-end' as const : 'flex-start' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: role === 'user' ? theme.sleepSoft : theme.sleepAiSoft,
  });

  const shownError = conversation.error;

  return <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}
    statusBarTranslucent presentationStyle="overFullScreen">
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
      <Pressable accessible={false} importantForAccessibility="no" onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none"
        style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
        <View accessibilityViewIsModal={Platform.OS !== 'web' || undefined}
          style={{ width: '100%', maxWidth: 600, height: '80%', maxHeight: 820,
          paddingTop: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.sm),
          borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: theme.background,
          boxShadow: shadows.overlay }}>
          <View style={{ width: 48, height: 5, borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
            backgroundColor: theme.border }} />
          <View style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: spacing.sm }}>
            <VitaAiAvatar size={54} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText variant="heading">{t('assistantTitle')}</ThemedText>
              <ThemedText variant="subhead" themeColor="textSecondary">{t('assistantSubtitle')}</ThemedText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose}
              style={({ pressed }) => ({ width: sizing.controlComfortable, height: sizing.controlComfortable,
                borderRadius: radius.full, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.7 : 1 })}>
              <ThemedText variant="heading" themeColor="accent">×</ThemedText>
            </Pressable>
          </View>

          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.md,
            gap: spacing.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator
            onLayout={() => scroll.current?.scrollToEnd({ animated: false })}>
            {!conversation.messages.length ? <View style={{ flex: 1, justifyContent: 'flex-end', gap: spacing.md }}>
              <AssistantBubble text={t('welcome')} />
            </View> : conversation.messages.map(message => <View key={message.id}
              style={{ alignItems: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {message.pending ? <View style={{ maxWidth: '86%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <VitaAiAvatar size={36} />
                <View style={[messageStyle('assistant'), { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
                  <ThemedText style={{ flex: 1 }}>{t('processing')}</ThemedText>
                  <ActivityIndicator size="small" color={theme.accent} />
                </View>
              </View> : message.role === 'assistant' ? <AssistantBubble text={message.text} />
                : <View style={messageStyle('user')}><ThemedText>{message.text}</ThemedText></View>}
            </View>)}

            {conversation.busy && !conversation.messages.some(message => message.pending) ? <View
              accessibilityRole="progressbar" accessibilityLabel={t('sending')} accessibilityLiveRegion="polite"
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <VitaAiAvatar size={36} />
              <View style={[messageStyle('assistant'), { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
                <ActivityIndicator size="small" color={theme.accent} />
                <ThemedText themeColor="textSecondary">{t('sending')}</ThemedText>
              </View>
            </View> : null}
          </ScrollView>

          {shownError ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row',
            alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
            <ThemedText themeColor="danger" variant="caption" style={{ flex: 1 }}>{t(shownError)}</ThemedText>
            <Pressable accessibilityRole="button" disabled={conversation.busy}
              onPress={() => void conversation.retrySend()} style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}>
              <ThemedText themeColor="accent" variant="labelStrong">{t('retry')}</ThemedText>
            </Pressable>
          </View> : null}
          {conversation.voiceError ? <View accessibilityRole="alert" accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ThemedText themeColor="danger" variant="caption" style={{ flex: 1 }}>
              {t(conversation.voiceError.retryable ? 'voiceRetryableError' : 'voiceError')}
            </ThemedText>
            {conversation.voiceError.retryable ? <Pressable accessibilityRole="button" disabled={conversation.busy} onPress={onRetryVoice}
              style={{ minHeight: sizing.controlMin, justifyContent: 'center' }}>
              <ThemedText themeColor="accent" variant="labelStrong">{t('retry')}</ThemedText>
            </Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')} disabled={conversation.busy}
              onPress={onDismissVoiceError} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin,
                justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText themeColor="textSecondary">×</ThemedText>
            </Pressable>
          </View> : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.xs,
            borderRadius: radius.full, backgroundColor: theme.backgroundElement, boxShadow: shadows.card }}>
            <TextInput accessibilityLabel={t('input')} accessibilityHint={t('characterLimit')}
              placeholder={t('input')} placeholderTextColor={theme.textSecondary}
              value={conversation.text} onChangeText={value => {
                conversation.setText(value.slice(0, 300));
                if (conversation.error) conversation.setError(undefined);
              }} editable={!conversation.busy} maxLength={300} multiline scrollEnabled
              returnKeyType="default" style={{ flex: 1, minHeight: sizing.controlComfortable, maxHeight: 112,
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: theme.text, fontSize: 16,
                lineHeight: 22, textAlignVertical: 'center' }} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('send')}
              accessibilityState={{ disabled: conversation.busy || !conversation.text.trim(), busy: conversation.busy }}
              disabled={conversation.busy || !conversation.text.trim()}
              onPress={() => void conversation.sendText()} style={({ pressed }) => ({ width: sizing.controlComfortable,
                height: sizing.controlComfortable, borderRadius: radius.full, backgroundColor: theme.accent,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}>
              <ThemedText themeColor="onAccent" variant="labelStrong">➤</ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

function AssistantBubble({ text }: { text: string }) {
  const theme = useTheme();
  return <View style={{ maxWidth: '86%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
    <VitaAiAvatar size={36} />
    <View style={{ flexShrink: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.lg, backgroundColor: theme.sleepAiSoft }}>
      <ThemedText>{text}</ThemedText>
    </View>
  </View>;
}
