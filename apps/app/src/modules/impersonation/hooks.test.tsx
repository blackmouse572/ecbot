import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const endCall = vi.fn();
vi.mock("@repo/client", () => ({
  authSharedControllerImpersonateEndV1: (...a: unknown[]) => endCall(...a),
}));

const replace = vi.fn();
vi.stubGlobal("location", { replace } as never);

import { impersonationAtom } from "./state";
import { useEndImpersonation } from "./hooks";

const withStore = (store: ReturnType<typeof createStore>) =>
  function Wrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  };

describe("useEndImpersonation", () => {
  beforeEach(() => {
    endCall.mockReset().mockResolvedValue({});
    replace.mockReset();
    sessionStorage.clear();
  });

  it("calls end, clears the atom, redirects to the admin user page", async () => {
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "jwt",
      expiresAt: Date.now() + 1000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "A", email: "a@x.com" },
    });
    const { result } = renderHook(() => useEndImpersonation(), {
      wrapper: withStore(store),
    });

    await result.current("manual");

    expect(endCall).toHaveBeenCalledTimes(1);
    expect(store.get(impersonationAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      `${import.meta.env.VITE_ADMIN_URL ?? ""}/users/u1`,
    );
  });

  it("still clears + redirects when the end call throws", async () => {
    endCall.mockRejectedValue(new Error("network"));
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "jwt",
      expiresAt: Date.now(),
      impersonatedBy: "a",
      user: { id: "u9", name: "B", email: "b@x.com" },
    });
    const { result } = renderHook(() => useEndImpersonation(), {
      wrapper: withStore(store),
    });

    await result.current("expired");

    expect(store.get(impersonationAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      `${import.meta.env.VITE_ADMIN_URL ?? ""}/users/u9`,
    );
  });
});
