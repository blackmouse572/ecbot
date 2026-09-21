/**
 * Answers a platform's GET webhook-verification handshake (e.g. Meta's
 * hub.challenge). Implement this and register it in registry.ts to add a
 * new platform — no changes needed to the route in index.ts. Config needed
 * to verify (secrets, tokens) should be imported directly from ../env,
 * validated at module load — not threaded through as a parameter.
 */
export interface ChallengeVerifier {
  /** URL slugs this verifier answers, e.g. ["messenger", "facebook"]. */
  readonly slugs: readonly string[];
  /** Decide the response to a GET /webhooks/:platform request. */
  verify(url: URL): Response;
}
