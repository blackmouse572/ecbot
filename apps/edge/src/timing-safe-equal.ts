/**
 * Constant-time string comparison for webhook/internal secrets.
 *
 * Cloudflare Workers exposes `crypto.subtle.timingSafeEqual` at runtime, but
 * it's a non-standard Workers-only extension: this app's tests run under
 * plain-Node vitest (no @cloudflare/vitest-pool-workers), which doesn't
 * implement it, and Node's own `crypto.subtle` doesn't have it either. A
 * hand-rolled compare keeps this portable and testable in both places.
 *
 * Length is checked first — the length of a secret isn't itself sensitive,
 * and `TextEncoder` output must be equal-length before a byte-by-byte XOR is
 * meaningful. Every byte is then XORed unconditionally (no early return) so
 * a mismatch doesn't leak *where* the strings differ via timing.
 *
 * `expected` is the configured secret; when it is unset or empty the
 * compare fails closed.
 */
export function timingSafeEqual(
  candidate: string,
  expected: string | undefined,
): boolean {
  // An unset/empty secret matches nothing — never an empty candidate.
  if (!expected) return false;

  const aBytes = new TextEncoder().encode(candidate);
  const bBytes = new TextEncoder().encode(expected);
  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}
