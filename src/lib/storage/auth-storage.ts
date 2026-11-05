import * as SecureStore from 'expo-secure-store';
import { createSerializedAuthStorage } from './serialized-auth-storage';

const REFRESH_TOKEN_KEY = 'vitaloom.auth.refresh-token';

export const authStorage = createSerializedAuthStorage(SecureStore, REFRESH_TOKEN_KEY);
