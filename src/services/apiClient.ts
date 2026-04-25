import { useAuthStore } from '@/store';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
}

function buildUrl(path: string, query?: QueryParams) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_URL}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  const payload = JSON.parse(text);
  return payload as T;
}

async function refreshAccessToken() {
  const state = useAuthStore.getState();
  if (!state.refreshToken) return null;

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });

  if (!response.ok) {
    await state.logout().catch(() => undefined);
    return null;
  }

  const payload = (await response.json()) as { token: string };
  state.setToken(payload.token);
  return payload.token;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const state = useAuthStore.getState();
  const headers: Record<string, string> = { ...options.headers };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData && body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const execute = async (tokenOverride?: string) =>
    fetch(buildUrl(path, options.query), {
      method,
      headers: tokenOverride ? { ...headers, Authorization: `Bearer ${tokenOverride}` } : headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });

  let response = await execute();

  if (response.status === 401 && !options.skipAuthRefresh && state.refreshToken) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      response = await execute(freshToken);
    }
  }

  if (!response.ok) {
    const payload = await parseResponse<any>(response).catch(() => ({}));
    const message = payload?.error || payload?.message || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return parseResponse<T>(response);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('POST', path, data, options),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('PUT', path, data, options),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('PATCH', path, data, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};
