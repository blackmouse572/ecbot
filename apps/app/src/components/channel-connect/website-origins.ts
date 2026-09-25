/**
 * Parses the allowed-origins input for a website widget. Shared by the
 * accounts create form (comma-separated) and the agent builder's channel
 * connect card (one per line) — both split on either separator so pasting a
 * comma- or newline-separated list works in each place.
 */
export function splitOrigins(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}
