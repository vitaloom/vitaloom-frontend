import { createSingleFlight, retryAfterUnauthorized } from './single-flight';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly field?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let refreshAccessToken: (() => Promise<string>) | null = null;
let sessionGeneration = 0;
const newRefreshFlight = () => createSingleFlight(async () => {
  if (!refreshAccessToken) throw new Error('Authentication is not initialized.');
  return refreshAccessToken();
});
let refreshSingleFlight = newRefreshFlight();

const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export function setAccessToken(token: string | null) { accessToken = token; }
export function setRefreshHandler(handler: (() => Promise<string>) | null) { refreshAccessToken = handler; }
export function getApiSessionGeneration() { return sessionGeneration; }
export function resetApiSession() {
  sessionGeneration += 1;
  accessToken = null;
  refreshSingleFlight = newRefreshFlight();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const parsedBody: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)
      ? parsedBody as Record<string, unknown>
      : {};
    const nestedError = body.error && typeof body.error === 'object' && !Array.isArray(body.error)
      ? body.error as Record<string, unknown>
      : {};
    const code = typeof body.code === 'string' && body.code.length > 0
      ? body.code
      : typeof nestedError.code === 'string' && nestedError.code.length > 0
        ? nestedError.code
        : 'REQUEST_FAILED';
    const message = typeof body.detail === 'string' && body.detail.length > 0
      ? body.detail
      : typeof nestedError.message === 'string' && nestedError.message.length > 0
        ? nestedError.message
        : 'Request failed.';
    throw new ApiError(response.status, code, message, typeof body.field === 'string' ? body.field : undefined);
  }
  return parsedBody as T;
}

async function send<T>(path: string, init: RequestInit, bearer: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to connect. Check your connection and try again.');
  }
  return parseResponse<T>(response);
}

export async function apiRequest<T>(
  path: string, init: RequestInit = {}, authenticated = false, expectedSession = sessionGeneration,
): Promise<T> {
  const assertSession = () => {
    if (authenticated && expectedSession !== sessionGeneration) {
      throw new ApiError(401, 'AUTH_SESSION_CHANGED', 'The authenticated account changed.');
    }
  };
  const initialToken = authenticated ? accessToken : null;
  return retryAfterUnauthorized(
    async (token) => {
      assertSession();
      try {
        const result = await send<T>(path, init, token);
        assertSession();
        return result;
      } catch (error) {
        assertSession();
        throw error;
      }
    },
    initialToken,
    (error) => error instanceof ApiError && error.status === 401 && error.code !== 'AUTH_SESSION_CHANGED'
      && authenticated && !!refreshAccessToken,
    () => accessToken,
    refreshSingleFlight,
  );
}

export async function rawApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return send<T>(path, init, null);
}
