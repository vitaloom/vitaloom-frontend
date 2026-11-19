import { apiRequest } from '../../lib/api/http-client';

export const assistantSandboxEnabled = process.env.EXPO_PUBLIC_ASSISTANT_SANDBOX === 'true';
export const sampleQuestion = 'Mình xem nhật ký giấc ngủ ở đâu?';
type Outcome = 'ANSWERED' | 'DEPENDENCY_UNAVAILABLE' | 'INSUFFICIENT_EVIDENCE' | 'PERMISSION_REQUIRED';
type Reply = { turnId: string; outcome: Outcome; answer: string; citations: unknown[] };

export function createTurnId() {
  return globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const digit = Math.floor(Math.random() * 16);
    return (part === 'x' ? digit : (digit & 3) | 8).toString(16);
  });
}

export async function sendSampleTurn(turnId: string, expectedSession: number, signal: AbortSignal) {
  const reply = await apiRequest<Reply>('/assistant/chat', {
    method: 'POST', signal,
    body: JSON.stringify({ turnId, text: sampleQuestion, consentAccepted: true }),
  }, true, expectedSession);
  if (reply?.turnId !== turnId || !['ANSWERED', 'DEPENDENCY_UNAVAILABLE', 'INSUFFICIENT_EVIDENCE',
    'PERMISSION_REQUIRED'].includes(reply.outcome) || typeof reply.answer !== 'string' ||
    !Array.isArray(reply.citations)) throw new Error('Invalid Assistant response.');
  const hasJournalSource = reply.outcome === 'ANSWERED' && reply.citations.some((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const citation = item as Record<string, unknown>;
    return citation.id === 'app-help-sleep-journal' && citation.version === 1 && citation.route === '/sleep/journal';
  });
  if (reply.outcome === 'ANSWERED' && (!reply.answer.trim() || !hasJournalSource)) {
    throw new Error('Missing Assistant answer or citation.');
  }
  return { outcome: reply.outcome, answer: reply.answer, hasJournalSource };
}
