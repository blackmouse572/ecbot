import { getDefaultStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_STORAGE_KEY = "eccho:access-token";

// tokenAtom persists to localStorage now (cross-tab sync via atomWithStorage
// + the storage event), so each test needs a fresh module/store to isolate.
async function loadFreshState() {
  vi.resetModules();
  return import("./state");
}

describe("tokenAtom", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts null with nothing in storage", async () => {
    const { tokenAtom } = await loadFreshState();
    expect(getDefaultStore().get(tokenAtom)).toBeNull();
  });

  it("reads an existing token from storage synchronously on init", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify("stored-token"));
    const { tokenAtom } = await loadFreshState();

    // No await/tick needed — getOnInit means this is available immediately.
    expect(getDefaultStore().get(tokenAtom)).toBe("stored-token");
  });

  it("persists writes to storage under the expected key", async () => {
    const { tokenAtom } = await loadFreshState();
    getDefaultStore().set(tokenAtom, "new-token");

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(
      JSON.stringify("new-token"),
    );
  });

  it("clears storage when set to null (logout)", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify("stored-token"));
    const { tokenAtom } = await loadFreshState();

    getDefaultStore().set(tokenAtom, null);

    expect(JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY)!)).toBeNull();
  });
});
