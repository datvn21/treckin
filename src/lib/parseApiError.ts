/**
 * Extracts a human-readable error message from an Axios error response.
 * Consolidates the duplicate parseApiError pattern across the codebase.
 *
 * @param err   - The caught error (unknown)
 * @param fallback - Fallback string when no API message is present
 */
export function parseApiError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const e = err as { response?: { data?: { message?: string | string[] } } };
    const msg = e.response?.data?.message;
    return Array.isArray(msg) ? msg.join(" ") : (msg ?? fallback);
  }
  return fallback;
}
