const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

/**
 * Resolves a media URL returned by the backend to a full absolute URL the browser
 * can load. The backend serves uploads at `/uploads/...` on its own origin (port 3000),
 * while the frontend dev server runs on a different port. Relative paths would fail,
 * so we prefix them with the API origin.
 *
 * - Already-absolute URLs (http/https/data/blob) are returned as-is.
 * - Relative `/uploads/...` paths are prefixed with API_URL.
 * - undefined/empty input returns undefined.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return url;
}
