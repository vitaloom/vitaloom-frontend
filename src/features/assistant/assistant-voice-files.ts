import { deleteAsync } from 'expo-file-system/legacy';

export function removeVoiceFile(uri?: string | null) {
  if (uri) void deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
