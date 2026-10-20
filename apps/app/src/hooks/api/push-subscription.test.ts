import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/client", () => ({
  notificationSharedControllerPushSubscribeV1: vi.fn(async () => ({})),
}));

import { notificationSharedControllerPushSubscribeV1 } from "@repo/client";
import { savePushSubscription } from "./notifications";

describe("savePushSubscription", () => {
  it("posts only the endpoint and keys the API accepts", async () => {
    const subscription = {
      toJSON: () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/a",
        // Browsers always add this; the API rejects unknown fields.
        expirationTime: null,
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    } as unknown as PushSubscription;

    await savePushSubscription(subscription);

    expect(notificationSharedControllerPushSubscribeV1).toHaveBeenCalledWith({
      body: {
        endpoint: "https://fcm.googleapis.com/fcm/send/a",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      },
    });
  });
});
