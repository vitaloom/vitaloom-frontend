import { apiRequest } from '../../lib/api/http-client';

export const assistantCourseEnabled = process.env.EXPO_PUBLIC_ASSISTANT_COURSE !== 'false';
const endpoint = '/assistant/mvp/conversations';

type Source = {
  id: string;
  version?: number;
  title: string;
  route: string;
  from?: string;
  to?: string;
};

type Turn = {
  turnId: string;
  text: string;
  parts: { status: string; text: string; source?: Source }[];
};

export type ConversationSummary = { id: string; updatedAt: string };
export type Conversation = ConversationSummary & { personalAllowed: boolean; turns: Turn[] };
export type AssistantAccountSettings = { personalDataAllowed: boolean };

function requireAccountSettings(value: AssistantAccountSettings): AssistantAccountSettings {
  if (!value || typeof value.personalDataAllowed !== 'boolean') {
    throw new Error('Invalid Assistant account settings.');
  }
  return value;
}

export function assistantSettingsApi(session: number, signal: AbortSignal) {
  return {
    get: async () => requireAccountSettings(await apiRequest<AssistantAccountSettings>(
      '/assistant/mvp/settings', { method: 'GET', signal }, true, session)),
    update: async (personalDataAllowed: boolean) => requireAccountSettings(await apiRequest<AssistantAccountSettings>(
      '/assistant/mvp/settings', { method: 'PUT', signal, body: JSON.stringify({ personalDataAllowed,
        ...(personalDataAllowed ? { consentVersion: 'gemini-health-v1' } : {}) }) }, true, session)),
  };
}

export function courseApi(session: number, signal: AbortSignal) {
  function request<T>(path: string, method = 'GET', payload?: object) {
    return apiRequest<T>(endpoint + path, { method, signal, body: payload && JSON.stringify(payload) }, true, session);
  }

  return {
    list: (page: number) => request<{ items: ConversationSummary[]; hasMore: boolean }>(`?page=${page}`),
    open: (id: string) => request<Conversation>(`/${id}`),
    create: () => request<Conversation>('', 'POST'),
    remove: (id: string) => request<void>(`/${id}`, 'DELETE'),
    permission: (id: string, allowed: boolean) => request<Conversation>(`/${id}/permission`, 'PUT', { allowed }),
    send: (id: string, text: string, turnId: string) => request<Conversation>(
      `/${id}/turns`, 'POST', { text, turnId }),
    voiceTurn: (audio: Blob, turnId: string, conversationId?: string) => {
      const form = new FormData();
      form.append('audio', audio, 'recording.m4a');
      form.append('turnId', turnId);
      if (conversationId) form.append('conversationId', conversationId);
      form.append('consentAccepted', 'true');
      form.append('consentVersion', 'assemblyai-us-v1');
      return apiRequest<Conversation>('/assistant/mvp/voice-turns', {
        method: 'POST', signal, body: form,
      }, true, session);
    },
  };
}
