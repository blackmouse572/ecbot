import {
  authSharedControllerImpersonateEndV1,
  authSharedControllerImpersonateRefreshV1,
} from "@repo/client";
import { useAtom, useAtomValue } from "jotai/react";
import { RESET } from "jotai/utils";
import { useCallback, useEffect } from "react";
import { ADMIN_URL, impersonationAtom } from "./state";

export const useImpersonation = () => useAtomValue(impersonationAtom);

export const useEndImpersonation = () => {
  const [session, setSession] = useAtom(impersonationAtom);

  return useCallback(
    async (): Promise<void> => {
      try {
        // No body: the server derives the end reason itself.
        await authSharedControllerImpersonateEndV1({ throwOnError: false });
      } catch {
        /* best-effort — the impersonation token may already be dead */
      }
      const targetId = session?.user?.id;
      setSession(RESET);
      // Without an admin URL there is no admin page to return to: go home.
      window.location.replace(
        ADMIN_URL ? `${ADMIN_URL}/users/${targetId ?? ""}` : "/",
      );
    },
    [session, setSession],
  );
};

const RETRY_MS = 10_000;

const END_MARGIN_MS = 1_000;
const CAP_TOLERANCE_MS = 1_500;

/**
 * How long to wait before renewing a token that expires at `expiresAt`: renew
 * a minute early, or at the halfway point for very short-lived tokens, but
 * never later than a second before expiry. When the token already runs to the
 * end of the session (`sessionEndsAt`), a renewal cannot extend it: schedule
 * one final call at the end, which the server answers with 401 so the session
 * ends (and is audited) instead of being polled in the last minute.
 */
export const nextRefreshDelay = (
  expiresAt: number,
  sessionEndsAt?: number,
  now: number = Date.now(),
): number => {
  const untilEnd = Math.max(0, expiresAt - now - END_MARGIN_MS);
  if (sessionEndsAt && expiresAt >= sessionEndsAt - CAP_TOLERANCE_MS) {
    return untilEnd;
  }
  const remaining = Math.max(0, expiresAt - now);
  return Math.min(untilEnd, remaining - Math.min(60_000, remaining / 2));
};

/**
 * Keeps an impersonation session alive in the background, like the normal
 * login does with its refresh token. A rejected renewal (session revoked,
 * past its cap, user blocked) ends the session; a network blip retries until
 * the current token itself runs out.
 */
export const useImpersonationRefresh = () => {
  const [session, setSession] = useAtom(impersonationAtom);
  const endImpersonation = useEndImpersonation();
  const accessToken = session?.accessToken;
  const expiresAt = session?.expiresAt;
  const sessionEndsAt = session?.sessionEndsAt;

  useEffect(() => {
    if (!accessToken || !expiresAt) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      if (Date.now() >= expiresAt) {
        void endImpersonation();
        return;
      }
      const res = await authSharedControllerImpersonateRefreshV1({
        throwOnError: false,
      }).catch(() => null);
      if (cancelled) return;

      const data = (res?.data as A | undefined)?.data as
        { accessToken: string; expiresIn: number; sessionEndsAt?: number }
        | undefined;
      if (data?.accessToken) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                accessToken: data.accessToken,
                expiresAt: Date.now() + data.expiresIn * 1000,
                sessionEndsAt: data.sessionEndsAt ?? prev.sessionEndsAt,
              }
            : prev,
        );
        return;
      }
      const status = res?.response?.status;
      if (status === 401 || status === 403) {
        void endImpersonation();
        return;
      }
      timer = setTimeout(run, RETRY_MS);
    };

    timer = setTimeout(run, nextRefreshDelay(expiresAt, sessionEndsAt));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, expiresAt, sessionEndsAt, endImpersonation, setSession]);
};
