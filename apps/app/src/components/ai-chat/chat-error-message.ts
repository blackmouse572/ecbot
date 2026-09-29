/**
 * The AI SDK transport throws the failed response body verbatim as
 * `error.message`. Show the API's own (localized) `message` from that body;
 * anything else (network failures, non-API bodies) gets the generic fallback,
 * so a visitor never sees raw JSON, paths or versions.
 */
export function chatErrorMessage(
  error: Error | undefined,
  fallback: string,
): string {
  try {
    const body: unknown = JSON.parse(error?.message ?? "");
    if (
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string" &&
      body.message
    ) {
      return body.message;
    }
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return fallback;
}
