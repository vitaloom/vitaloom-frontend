import { createSingleFlight, retryAfterUnauthorized } from './single-flight';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let refreshAccessToken: (() => Promise<string>) | null = null;
const refreshSingleFlight = createSingleFlight(async () => {
  if (!refreshAccessToken) throw new Error('Authentication is not initialized.');
  return refreshAccessToken();
});

const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export function setAccessToken(token: string | null) { accessToken = token; }
export function setRefreshHandler(handler: (() => Promise<string>) | null) { refreshAccessToken = handler; }

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
    throw new ApiError(response.status, code, message);
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

export async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const initialToken = authenticated ? accessToken : null;
  return retryAfterUnauthorized(
    (token) => send<T>(path, init, token),
    initialToken,
    (error) => error instanceof ApiError && error.status === 401 && authenticated && !!refreshAccessToken,
    () => accessToken,
    refreshSingleFlight,
  );
}

export async function rawApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return send<T>(path, init, null);
}
