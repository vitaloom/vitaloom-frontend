import { getApiSessionGeneration } from '@/lib/api/http-client';

let acceptedSession: number | undefined;

export function hasAssistantVoiceConsent() {
  return acceptedSession === getApiSessionGeneration();
}

export function acceptAssistantVoiceConsent() {
  acceptedSession = getApiSessionGeneration();
}
