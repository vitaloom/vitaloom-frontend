import { useCallback, useEffect, useRef, useState } from 'react';

import type { File as ExpoFile } from 'expo-file-system';

import { ApiError, getApiSessionGeneration } from '@/lib/api/http-client';

import { useAssistantAccess } from './assistant-access-provider';
import { createTurnId } from './assistant-api';
import { courseApi, type Conversation } from './assistant-course-api';
import { removeVoiceFile } from './assistant-voice-files';

export type AssistantMessage = { id: string; role: 'user' | 'assistant'; text: string; pending?: boolean };
export type AssistantVoiceError = { retryable: boolean };
type TextRetry = { text: string; turnId: string };
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

export function useAssistantConversation(personalDataAllowed: boolean) {
  const { refresh } = useAssistantAccess();
  const sessionGeneration = getApiSessionGeneration();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TextError>();
  const [voiceError, setVoiceError] = useState<AssistantVoiceError | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const pending = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const activeConversationId = useRef<string | undefined>(undefined);
  const retry = useRef<TextRetry | undefined>(undefined);
  const voiceRetry = useRef<{ audio: ExpoFile; turnId: string; conversationId?: string; session: number } | undefined>(undefined);

  const messageError = useCallback((failure: unknown): TextError => {
    if (!(failure instanceof ApiError)) return 'requestError';
    if (failure.status === 403) void refresh();
    if ([401, 403, 404].includes(failure.status)) return 'blockedError';
    if (failure.status === 409) return 'conflictError';
    return 'requestError';
  }, [refresh]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      pending.current = null;
      removeVoiceFile(voiceRetry.current?.audio.uri);
      voiceRetry.current = undefined;
    };
  }, []);

  useEffect(() => {
    const pendingVoice = voiceRetry.current;
    if (!pendingVoice || pendingVoice.session === sessionGeneration) return;
    pending.current?.abort();
    pending.current = null;
    removeVoiceFile(pendingVoice.audio.uri);
    voiceRetry.current = undefined;
    locked.current = false;
    setBusy(false);
    setVoiceError({ retryable: false });
  }, [sessionGeneration]);

  const applyConversation = useCallback((row: Conversation) => {
    activeConversationId.current = row.id;
    setConversationId(row.id);
    setMessages(conversationMessages(row));
  }, []);

  const sendText = useCallback(async (draft = text) => {
    const content = draft.trim();
    if (!personalDataAllowed || !content || locked.current) return;
    const saved = retry.current;
    const turnId = saved?.text === content ? saved.turnId : createTurnId();
    retry.current = { text: content, turnId };
    const session = getApiSessionGeneration();
    const controller = new AbortController();
    locked.current = true;
    pending.current = controller;
    setBusy(true);
    setError(undefined);
    setText(current => current.trim() === content ? '' : current);
    setMessages(previous => [
      ...previous.filter(message => message.id !== `${turnId}:user`),
      { id: `${turnId}:user`, role: 'user', text: content },
    ]);
    try {
      const client = courseApi(session, controller.signal);
      const row = activeConversationId.current
          ? await client.send(activeConversationId.current, content, turnId)
        : await client.create().then(conversation => {
          if (!mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) return;
          activeConversationId.current = conversation.id;
          setConversationId(conversation.id);
          return client.send(conversation.id, content, turnId);
        });
      if (!row || !mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) return;
      applyConversation(row);
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
  }, [applyConversation, messageError, personalDataAllowed, text]);

  const beginVoice = useCallback((preservePendingVoice = false) => {
    if (!personalDataAllowed || locked.current || pending.current) return false;
    if (!preservePendingVoice) {
      removeVoiceFile(voiceRetry.current?.audio.uri);
      voiceRetry.current = undefined;
    }
    locked.current = true;
    setBusy(true);
    setError(undefined);
    setVoiceError(null);
    return true;
  }, [personalDataAllowed]);

  const submitVoice = useCallback(async (audio: ExpoFile, turnId: string, conversationId?: string) => {
    if (!personalDataAllowed || !locked.current || pending.current) {
      removeVoiceFile(audio.uri);
      return true;
    }
    const session = getApiSessionGeneration();
    const attempt = { audio, turnId, conversationId, session };
    voiceRetry.current = attempt;
    const discardAttempt = () => {
      removeVoiceFile(audio.uri);
      if (voiceRetry.current === attempt) voiceRetry.current = undefined;
    };
    const controller = new AbortController();
    pending.current = controller;
    try {
      const row = await courseApi(session, controller.signal).voiceTurn(audio, turnId, conversationId);
      if (!mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) {
        discardAttempt();
        return true;
      }
      applyConversation(row);
      retry.current = undefined;
      discardAttempt();
      return true;
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted || session !== getApiSessionGeneration()) {
        discardAttempt();
        return true;
      }
      if (failure instanceof ApiError && failure.status === 403) void refresh();
      if (failure instanceof ApiError && failure.status >= 400 && failure.status < 500 && failure.status !== 409) {
        setVoiceError({ retryable: false });
        discardAttempt();
        return true;
      }
      setVoiceError({ retryable: true });
      return false;
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        locked.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  }, [applyConversation, personalDataAllowed, refresh]);

  const retryVoice = useCallback(async () => {
    const saved = voiceRetry.current;
    if (!saved || locked.current || pending.current || !beginVoice(true)) return false;
    if (saved.session !== getApiSessionGeneration()) {
      removeVoiceFile(saved.audio.uri);
      voiceRetry.current = undefined;
      locked.current = false;
      setBusy(false);
      setVoiceError({ retryable: false });
      return false;
    }
    return submitVoice(saved.audio, saved.turnId, saved.conversationId);
  }, [beginVoice, submitVoice]);

  const cancelVoice = useCallback(() => {
    if (pending.current) return;
    locked.current = false;
    setBusy(false);
  }, []);

  const failVoice = useCallback(() => {
    if (pending.current) return;
    cancelVoice();
    setVoiceError({ retryable: false });
  }, [cancelVoice]);

  const dismissVoiceError = useCallback(() => {
    removeVoiceFile(voiceRetry.current?.audio.uri);
    voiceRetry.current = undefined;
    setVoiceError(null);
  }, []);

  const reset = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    locked.current = false;
    retry.current = undefined;
    removeVoiceFile(voiceRetry.current?.audio.uri);
    voiceRetry.current = undefined;
    activeConversationId.current = undefined;
    setConversationId(undefined);
    setMessages([]);
    setText('');
    setBusy(false);
    setError(undefined);
    setVoiceError(null);
  }, []);

  const retrySend = useCallback(async () => {
    const saved = retry.current;
    if (!saved || locked.current) return;
    await sendText(saved.text);
  }, [sendText]);

  return {
    messages, text, setText, busy, error, setError, sendText, retrySend,
    activeConversationId: conversationId,
    beginVoice, submitVoice, retryVoice, cancelVoice, failVoice, voiceError, dismissVoiceError, reset,
  };
}
