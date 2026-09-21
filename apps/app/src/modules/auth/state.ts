import { atomWithStorage } from "jotai/utils";

export const TOKEN_STORAGE_KEY = "eccho:access-token";

// Persisted to localStorage (same atomWithStorage pattern as
// lastWorkspaceSlugAtom in modules/workspace/state.ts): a login/refresh/
// logout in one tab updates every other open tab via the native storage
// event, and a stored token is available synchronously on boot (getOnInit),
// so there's no async gap for a route loader to race against.
export const tokenAtom = atomWithStorage<string | null>(
  TOKEN_STORAGE_KEY,
  null,
  undefined,
  { getOnInit: true },
);

// Set synchronously for the duration of the server logout round-trip.
// useRefreshTokenEffect's 401 interceptor checks this and skips refreshing —
// otherwise client.clear() (called at the end of logout) triggers a refetch
// storm that races the still-live refresh cookie back into a session before
// the server has cleared it. A plain mutable ref, not an atom: no component
// needs to re-render off this value.
export const logoutGuard = { current: false };
