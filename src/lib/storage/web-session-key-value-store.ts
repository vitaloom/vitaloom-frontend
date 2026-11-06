import type { SecureKeyValueStore } from './serialized-auth-storage';

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createWebSessionKeyValueStore(getStorage: () => SessionStorageLike | undefined): SecureKeyValueStore {
  const storage = () => {
    const value = getStorage();
    if (!value) throw new Error('Browser session storage is unavailable.');
    return value;
  };
  return {
    getItemAsync: async (key) => storage().getItem(key),
    setItemAsync: async (key, value) => { storage().setItem(key, value); },
    deleteItemAsync: async (key) => { storage().removeItem(key); },
  };
}
