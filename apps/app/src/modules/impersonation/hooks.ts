import { authSharedControllerImpersonateEndV1 } from "@repo/client";
import { useAtom, useAtomValue } from "jotai/react";
import { RESET } from "jotai/utils";
import { useCallback } from "react";
import { ADMIN_URL, impersonationAtom } from "./state";

export const useImpersonation = () => useAtomValue(impersonationAtom);

export const useEndImpersonation = () => {
  const [session, setSession] = useAtom(impersonationAtom);

  return useCallback(
    async (reason: "manual" | "expired"): Promise<void> => {
      // `reason` is accepted for call-site clarity; the endpoint takes no body.
      void reason;
      try {
        await authSharedControllerImpersonateEndV1({ throwOnError: false });
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
