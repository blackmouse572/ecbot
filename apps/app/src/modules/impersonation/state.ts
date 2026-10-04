import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const IMPERSONATION_STORAGE_KEY = "impersonation-session";

export type ImpersonationSession = {
  accessToken: string;
  /** epoch ms — computed at exchange time from expiresIn */
  expiresAt: number;
  impersonatedBy: string;
  user: { id: string; name: string; email: string };
};

const storage = createJSONStorage<ImpersonationSession | null>(
  () => sessionStorage,
);

// Tab-scoped on purpose: sessionStorage, not localStorage. Closing the tab ends
// the impersonation session; the parallel auth module owns the localStorage token.
export const impersonationAtom = atomWithStorage<ImpersonationSession | null>(
  IMPERSONATION_STORAGE_KEY,
  null,
  storage,
  { getOnInit: true },
);

// An impersonation token past its expiresAt is dead server-side, so a stale
// session left in sessionStorage must never be used as credentials.
export const isImpersonationActive = (
  session: ImpersonationSession | null | undefined,
  now: number = Date.now(),
): session is ImpersonationSession =>
  !!session?.accessToken && session.expiresAt > now;

export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL as string | undefined;
