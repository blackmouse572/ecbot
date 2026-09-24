import { env } from "../env";
import type { ChallengeVerifier } from "./challenge-verifier";

// Mirrors apps/api's verifyMetaChallenge() (Messenger and WhatsApp share one
// Meta app, so one handshake and one secret) — keep in sync if that changes. Edge verifies locally (holds its own copy of
// FACEBOOK_WEBHOOK_SECRET) so Meta's GET handshake works directly against
// this worker without a round-trip to apps/api.
export const facebookChallengeVerifier: ChallengeVerifier = {
  slugs: ["messenger", "facebook", "whatsapp"],
  verify(url) {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === env.FACEBOOK_WEBHOOK_SECRET) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  },
};
