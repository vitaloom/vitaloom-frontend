export type SecureKeyValueStore = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export function createSerializedAuthStorage(store: SecureKeyValueStore, key: string) {
  let tail: Promise<void> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation, operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  }

  return {
    getRefreshToken: () => enqueue(() => store.getItemAsync(key)),
    saveRefreshToken: (token: string) => enqueue(() => store.setItemAsync(key, token)),
    clear: () => enqueue(() => store.deleteItemAsync(key)),
  };
}
