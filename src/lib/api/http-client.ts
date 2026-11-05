import { createSingleFlight, retryAfterUnauthorized } from './single-flight';

type ApiErrorBody = { error?: { code?: string; message?: string } };
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
  const body = await response.json().catch(() => ({})) as ApiErrorBody & T;
  if (!response.ok) {
    throw new ApiError(response.status, body.error?.code ?? 'REQUEST_FAILED', body.error?.message ?? 'Request failed.');
  }
  return body as T;
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
