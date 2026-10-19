import {
  notificationQueryKey,
  savePushSubscription,
} from "@/hooks/api/notifications";
import { useImpersonation } from "@/modules/impersonation/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getBrowserPushSubscription } from "./service-worker";

/**
 * Mounted once in the signed-in layout. A push refreshes the bell at once
 * (instead of on the next poll), and a browser that already has push on is
 * re-saved for whoever is signed in, so the device follows the account.
 * Not while impersonating: the device stays with the operator.
 */
export function usePushBridge() {
  const queryClient = useQueryClient();
  const impersonating = !!useImpersonation();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "notification") return;
      queryClient.invalidateQueries({ queryKey: notificationQueryKey.all });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    if (!impersonating) {
      getBrowserPushSubscription()
        .then(
          (subscription) => subscription && savePushSubscription(subscription),
        )
        .catch(() => undefined);
    }

    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient, impersonating]);
}
