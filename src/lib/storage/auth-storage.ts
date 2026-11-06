import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createSerializedAuthStorage } from './serialized-auth-storage';
import { createWebSessionKeyValueStore } from './web-session-key-value-store';

const REFRESH_TOKEN_KEY = 'vitaloom.auth.refresh-token';

const store = Platform.OS === 'web'
  ? createWebSessionKeyValueStore(() => globalThis.sessionStorage)
  : SecureStore;

export const authStorage = createSerializedAuthStorage(store, REFRESH_TOKEN_KEY);
