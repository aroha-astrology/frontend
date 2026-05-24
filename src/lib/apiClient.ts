// Centralized API client. ALL calls to the backend MUST go through this wrapper
// so the host can be swapped per-environment without grepping fetch() calls.
//
// In dev: NEXT_PUBLIC_API_URL=http://localhost:3001 (backend Next.js running on 3001)
// In prod: NEXT_PUBLIC_API_URL=https://api.arohaastrology.in
//
// Server components / route handlers in the frontend repo can also call this —
// it works in both Node and browser contexts.

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

if (!API_URL && typeof window !== 'undefined') {
  console.warn(
    '[apiClient] NEXT_PUBLIC_API_URL is not set — all API calls will be relative to the frontend origin and will 404 in production.',
  );
}

export type ApiFetchInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
};

/**
 * Fetch from the backend. Path must start with `/api/...`.
 * JSON bodies are auto-serialized when `body` is a plain object.
 */
export function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  if (!path.startsWith('/')) {
    throw new Error(`apiFetch: path must start with '/' — got "${path}"`);
  }
  const url = `${API_URL}${path}`;

  const headers = new Headers(init.headers ?? {});
  let body: BodyInit | undefined;

  if (init.body !== undefined && init.body !== null) {
    if (
      typeof init.body === 'object' &&
      !(init.body instanceof FormData) &&
      !(init.body instanceof Blob) &&
      !(init.body instanceof ArrayBuffer) &&
      !(init.body instanceof URLSearchParams) &&
      !(init.body instanceof ReadableStream)
    ) {
      body = JSON.stringify(init.body);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    } else {
      body = init.body as BodyInit;
    }
  }

  return fetch(url, {
    ...init,
    headers,
    body,
    credentials: init.credentials ?? 'include',
  });
}

/** Shorthand: `apiFetch(path).then(r => r.json())`. Throws on non-2xx. */
export async function apiJson<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const resp = await apiFetch(path, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`apiJson ${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`);
  }
  return (await resp.json()) as T;
}

export { API_URL };
