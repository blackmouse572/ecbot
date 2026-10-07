import {
  isImpersonationActive,
  type ImpersonationSession,
} from "@/modules/impersonation";

// The credential a request/route should act with: a live impersonation token
// wins over the real one; an expired one is ignored (it is dead server-side).
export function pickAuthToken(
  impersonation: ImpersonationSession | null | undefined,
  token: string | null,
  now: number = Date.now(),
): string | null {
  return isImpersonationActive(impersonation, now)
    ? impersonation.accessToken
    : token;
}
