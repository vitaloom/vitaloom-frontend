export function createSingleFlight<T>(operation: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (pending) return pending;
    pending = operation().finally(() => { pending = null; });
    return pending;
  };
}

export async function retryAfterUnauthorized<T>(
  send: (token: string | null) => Promise<T>,
  initialToken: string | null,
  isRefreshableUnauthorized: (error: unknown) => boolean,
  getCurrentToken: () => string | null,
  refresh: () => Promise<string>,
): Promise<T> {
  try {
    return await send(initialToken);
  } catch (error) {
    if (!isRefreshableUnauthorized(error)) throw error;
    const currentToken = getCurrentToken();
    if (currentToken && currentToken !== initialToken) return send(currentToken);
    const freshToken = await refresh();
    return send(freshToken);
  }
}
