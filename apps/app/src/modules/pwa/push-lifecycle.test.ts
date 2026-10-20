import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/a",
  unsubscribe: vi.fn(async () => true),
};

vi.mock("./service-worker", () => ({
  getBrowserPushSubscription: vi.fn(async () => subscription),
  subscribeBrowser: vi.fn(),
}));

vi.mock("@/hooks/api/notifications", () => ({
  notificationQueryKey: { all: ["notifications"] },
  savePushSubscription: vi.fn(async () => ({})),
  removePushSubscription: vi.fn(async () => ({})),
  usePushPublicKey: () => ({ publicKey: "BPublic", isLoading: false }),
}));

let impersonation: unknown = null;
vi.mock("@/modules/impersonation/hooks", () => ({
  useImpersonation: () => impersonation,
}));

import {
  removePushSubscription,
  savePushSubscription,
} from "@/hooks/api/notifications";
import { usePushBridge } from "./use-push-bridge";
import { removeThisDeviceFromPush } from "./use-push-notifications";

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe("push on this device", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    impersonation = null;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    });
  });

  it("stops push in this browser on sign-out even if the server call fails", async () => {
    vi.mocked(removePushSubscription).mockRejectedValueOnce(new Error("401"));

    await expect(removeThisDeviceFromPush()).rejects.toThrow("401");

    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it("re-saves this browser for the signed-in user", async () => {
    renderHook(() => usePushBridge(), { wrapper });

    await waitFor(() => expect(savePushSubscription).toHaveBeenCalled());
  });

  it("keeps the device on the operator's account while impersonating", async () => {
    impersonation = { user: { id: "user-2" } };
    renderHook(() => usePushBridge(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(savePushSubscription).not.toHaveBeenCalled();
  });
});
