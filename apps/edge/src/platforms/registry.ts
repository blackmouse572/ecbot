import type { ChallengeVerifier } from "./challenge-verifier";
import { facebookChallengeVerifier } from "./facebook";

// Add a new platform's GET-challenge verifier here.
const verifiers: ChallengeVerifier[] = [facebookChallengeVerifier];

const bySlug = new Map<string, ChallengeVerifier>(
  verifiers.flatMap((verifier) =>
    verifier.slugs.map((slug) => [slug, verifier] as const),
  ),
);

export function getChallengeVerifier(
  slug: string,
): ChallengeVerifier | undefined {
  return bySlug.get(slug);
}
