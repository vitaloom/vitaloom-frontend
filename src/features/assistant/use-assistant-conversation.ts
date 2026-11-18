import { useCallback, useEffect, useRef, useState } from 'react';

import type { File as ExpoFile } from 'expo-file-system';

import { ApiError, getApiSessionGeneration } from '@/lib/api/http-client';

import { createTurnId } from './assistant-api';
import { courseApi, type Conversation } from './assistant-course-api';

export type AssistantMessage = { id: string; role: 'user' | 'assistant'; text: string; pending?: boolean };
export type AssistantVoiceError = { retryable: boolean };
type TextRetry = { text: string; turnId: string; geminiAccepted: boolean };
type TextError = 'blockedError' | 'conflictError' | 'requestError';

function conversationMessages(row: Conversation): AssistantMessage[] {
  const messages: AssistantMessage[] = [];
  for (const turn of row.turns) {
    messages.push({ id: `${turn.turnId}:user`, role: 'user', text: turn.text });
    for (const [index, part] of turn.parts.entries()) {
      if (part.text.trim()) messages.push({ id: `${turn.turnId}:assistant:${index}`, role: 'assistant', text: part.text });
    }
  }
  return messages;
}

export function useAssistantConversation() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TextError>();
  const [voiceError, setVoiceError] = useState<AssistantVoiceError | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [geminiAccepted, setGeminiAccepted] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const activeConversationId = useRef<string | undefined>(undefined);
  const retry = useRef<TextRetry | undefined>(undefined);
  const previousMessages = useRef<AssistantMessage[]>([]);

  const messageError = useCallback((failure: unknown): TextError => {
    if (!(failure instanceof ApiError)) return 'requestError';
    if ([401, 403, 404].includes(failure.status)) return 'blockedError';
    if (failure.status === 409) return 'conflictError';
    return 'requestError';
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      pending.current = null;
    };
  }, []);

  const applyConversation = useCallback((row: Conversation) => {
    activeConversationId.current = row.id;
    setConsentAccepted(true);
    setMessages(conversationMessages(row));
  }, []);

  const sendText = useCallback(async (draft = text) => {
    const content = draft.trim();
    if (!content || locked.current) return;
    if (!consentAccepted) {
      setConsentRequired(true);
      return;
    }
    setConsentRequired(false);
    const saved = retry.current;
    const allowGemini = geminiAccepted;
    const turnId = saved?.text === content && saved.geminiAccepted === allowGemini ? saved.turnId : createTurnId();
    retry.current = { text: content, turnId, geminiAccepted: allowGemini };
    const session = getApiSessionGeneration();
    const controller = new AbortController();
    locked.current = true;
    pending.current = controller;
    setBusy(true);
    setError(undefined);
    setMessages(previous => [
      ...previous.filter(message => message.id !== `${turnId}:user`),
      { id: `${turnId}:user`, role: 'user', text: content },
    ]);
    try {
      const client = courseApi(session, controller.signal);
      const row = activeConversationId.current
          ? await client.send(activeConversationId.current, content, turnId, allowGemini)
        : await client.create().then(conversation => {
          activeConversationId.current = conversation.id;
          return client.send(conversation.id, content, turnId, allowGemini);
        });
      if (!mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) return;
      applyConversation(row);
      setText('');
      setGeminiAccepted(false);
      retry.current = undefined;
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted && session === getApiSessionGeneration()) {
        setError(messageError(failure));
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        locked.current = false;
        if (mounted.current && session === getApiSessionGeneration()) setBusy(false);
      }
    }
  }, [applyConversation, consentAccepted, geminiAccepted, messageError, text]);

  const beginVoice = useCallback(() => {
    if (locked.current || pending.current) return false;
    locked.current = true;
    previousMessages.current = messages;
    setBusy(true);
    setError(undefined);
    setVoiceError(null);
    setMessages([{ id: 'voice:processing', role: 'assistant', text: 'processing', pending: true }]);
    return true;
  }, [messages]);

  const submitVoice = useCallback(async (audio: ExpoFile, turnId: string) => {
    if (!locked.current || pending.current) return false;
    const session = getApiSessionGeneration();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const row = await courseApi(session, controller.signal).voiceTurn(audio, turnId);
      if (!mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) return true;
      applyConversation(row);
      retry.current = undefined;
      previousMessages.current = [];
      return true;
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) return true;
      if (failure instanceof ApiError && [400, 401, 403, 404, 413, 415, 422].includes(failure.status)) {
        setVoiceError({ retryable: false });
        setMessages(previousMessages.current);
        return true;
      }
      setMessages(previousMessages.current);
      setVoiceError({ retryable: true });
      return false;
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        locked.current = false;
        if (mounted.current && session === getApiSessionGeneration()) setBusy(false);
      }
    }
  }, [applyConversation]);

  const failVoice = useCallback(() => {
    if (pending.current) return;
    locked.current = false;
    setBusy(false);
    setVoiceError({ retryable: false });
    setMessages(previousMessages.current);
  }, []);

  const dismissVoiceError = useCallback(() => setVoiceError(null), []);

  const retrySend = useCallback(async () => {
    const saved = retry.current;
    if (!saved || locked.current) return;
    await sendText(saved.text);
  }, [sendText]);

  return {
    messages, text, setText, busy, error, setError, consentAccepted,
    setConsentAccepted, geminiAccepted, setGeminiAccepted, consentRequired,
    dismissConsentRequired: () => setConsentRequired(false), sendText, retrySend,
    beginVoice, submitVoice, failVoice, voiceError, dismissVoiceError,
  };
}
