import type { SessionListResponseDto } from "@repo/client";

export const SESSION_STATUSES = [
  "ACTIVE",
  "REVOKED",
] as const satisfies readonly SessionListResponseDto["status"][];
export type SessionStatus = SessionListResponseDto["status"];

// Compile-time exhaustiveness: also fails if a value is ADDED to the API union
// (satisfies alone only catches removals).
type _Exhaustive =
  Exclude<SessionStatus, (typeof SESSION_STATUSES)[number]> extends never
    ? true
    : ["SESSION_STATUSES missing a status"];
const _assertExhaustive: _Exhaustive = true;
void _assertExhaustive;

export const isSessionStatus = (v: string): v is SessionStatus =>
  (SESSION_STATUSES as readonly string[]).includes(v);

// Only an active session can be revoked; a revoked one is already terminal.
export const canRevoke = (status: SessionStatus): boolean => status === "ACTIVE";
