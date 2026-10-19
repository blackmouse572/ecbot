import {
  removePushSubscription,
  savePushSubscription,
  usePushPublicKey,
} from "@/hooks/api/notifications";
import { useEffect, useState } from "react";
import { getPushSupport, type PushSupport } from "./push-support";
import { getBrowserPushSubscription, subscribeBrowser } from "./service-worker";

/**
 * Push on this device: what the browser allows, whether it is on here, and
 * the switch. "off" means the server has no push key (push not set up).
 */
export function usePushNotifications() {
  const { publicKey, isLoading } = usePushPublicKey();
  const [support, setSupport] = useState<PushSupport>(() => getPushSupport());
  // Browser state, read from the PushManager, not server data.
  const [enabled, setEnabled] = useState(false);
  const [isPending, setPending] = useState(false);

  useEffect(() => {
    getBrowserPushSubscription()
      .then((subscription) => setEnabled(subscription !== null))
      .catch(() => setEnabled(false));
  }, []);

  const enable = async () => {
    if (!publicKey) return;
    setPending(true);
    try {
      const subscription = await subscribeBrowser(publicKey);
      if (!subscription) {
        // The user said no in the browser's dialog (or closed it).
        setSupport(getPushSupport());
        return;
      }
      await savePushSubscription(subscription);
      setEnabled(true);
    } finally {
      setPending(false);
    }
  };

  const disable = async () => {
    setPending(true);
    try {
      await removeThisDeviceFromPush();
      setEnabled(false);
    } finally {
      setPending(false);
    }
  };

  return {
    status: isLoading ? "loading" : publicKey ? support : "off",
    enabled,
    isPending,
    enable,
    disable,
  } as const;
}

/** Stops push on this browser, here and on the server. Used on sign-out. */
export async function removeThisDeviceFromPush(): Promise<void> {
  const subscription = await getBrowserPushSubscription();
  if (!subscription) return;
  await removePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}
