import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { impersonationAtom } from "@/modules/impersonation";
import { tokenAtom } from "./state";
import { useAuthToken } from "./hooks";

const wrap = (store: ReturnType<typeof createStore>) =>
  function W({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  };

describe("useAuthToken", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("returns the real token when not impersonating", () => {
    const store = createStore();
    store.set(tokenAtom, "real-jwt");
    const { result } = renderHook(() => useAuthToken(), {
      wrapper: wrap(store),
    });
    expect(result.current).toBe("real-jwt");
  });

  it("returns the impersonation token when the atom is set", () => {
    const store = createStore();
    store.set(tokenAtom, "real-jwt");
    store.set(impersonationAtom, {
      accessToken: "imp-jwt",
      expiresAt: Date.now() + 1000,
      impersonatedBy: "a",
      user: { id: "u1", name: "A", email: "a@x.com" },
    });
    const { result } = renderHook(() => useAuthToken(), {
      wrapper: wrap(store),
    });
    expect(result.current).toBe("imp-jwt");
  });
});
