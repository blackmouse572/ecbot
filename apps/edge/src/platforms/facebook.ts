import { env } from "../env";
import { timingSafeEqual } from "../timing-safe-equal";
import type { ChallengeVerifier } from "./challenge-verifier";

// Mirrors apps/api's verifyMetaChallenge(): every Meta product answers the same
// hub.* handshake with the same verify token, FACEBOOK_WEBHOOK_SECRET — that
// token is the only thing the four slugs share. Each product has its own
// callback URL and its own POST signature secret: Messenger and WhatsApp run on
// one Meta app (FACEBOOK_APP_SECRET), Instagram on the Instagram app
// (INSTAGRAM_APP_SECRET) and Threads on a separate Threads app
// (THREADS_APP_SECRET) — see apps/api/docs/platforms.md. Keep in sync if that
// changes. Edge verifies locally (holds its own copy of
// FACEBOOK_WEBHOOK_SECRET) so Meta's GET handshake works directly against
// this worker without a round-trip to apps/api.
export const facebookChallengeVerifier: ChallengeVerifier = {
  slugs: ["messenger", "facebook", "whatsapp", "instagram", "threads"],
  verify(url) {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (
      mode === "subscribe" &&
      token !== null &&
      timingSafeEqual(token, env.FACEBOOK_WEBHOOK_SECRET)
    ) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  },
};
