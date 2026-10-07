import { createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { IMPERSONATION_STORAGE_KEY, impersonationAtom } from "./state";

describe("impersonationAtom", () => {
  beforeEach(() => sessionStorage.clear());

  it("persists to sessionStorage, not localStorage", () => {
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "jwt",
      expiresAt: 123,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "A", email: "a@x.com" },
    });
    expect(sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)).toContain("jwt");
    expect(localStorage.getItem(IMPERSONATION_STORAGE_KEY)).toBeNull();
  });

  it("defaults to null when nothing stored", () => {
    expect(createStore().get(impersonationAtom)).toBeNull();
  });
});
