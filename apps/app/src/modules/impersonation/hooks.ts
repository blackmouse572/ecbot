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
    async (reason: "manual" | "expired"): Promise<void> => {
      try {
        await authSharedControllerImpersonateEndV1({
          body: { reason },
          throwOnError: false,
        });
      } catch {
        /* best-effort — the impersonation token may already be dead */
      }
      const targetId = session?.user?.id;
      setSession(RESET);
      window.location.replace(`${ADMIN_URL ?? ""}/users/${targetId ?? ""}`);
    },
    [session, setSession],
  );
};

const RETRY_MS = 10_000;

/**
 * How long to wait before renewing a token that expires at `expiresAt`: renew
 * a minute early, or at the halfway point for very short-lived tokens.
 */
export const nextRefreshDelay = (
  expiresAt: number,
  now: number = Date.now(),
): number => {
  const remaining = Math.max(0, expiresAt - now);
  return Math.max(1_000, remaining - Math.min(60_000, remaining / 2));
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

  useEffect(() => {
    if (!accessToken || !expiresAt) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      if (Date.now() >= expiresAt) {
        void endImpersonation("expired");
        return;
      }
      const res = await authSharedControllerImpersonateRefreshV1({
        throwOnError: false,
      }).catch(() => null);
      if (cancelled) return;

      const data = (res?.data as A | undefined)?.data as
        { accessToken: string; expiresIn: number } | undefined;
      if (data?.accessToken) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                accessToken: data.accessToken,
                expiresAt: Date.now() + data.expiresIn * 1000,
              }
            : prev,
        );
        return;
      }
      const status = res?.response?.status;
      if (status === 401 || status === 403) {
        void endImpersonation("expired");
        return;
      }
      timer = setTimeout(run, RETRY_MS);
    };

    timer = setTimeout(run, nextRefreshDelay(expiresAt));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, expiresAt, endImpersonation, setSession]);
};
