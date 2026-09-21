import { RESET } from "jotai/utils";
import { createStore } from "jotai/vanilla";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_WORKSPACE_STORAGE_KEY } from "./state";

describe("lastWorkspaceSlugAtom", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  // RootRedirect / Onboard redirect on their very first render — if the stored
  // slug only arrives after the atom mounts, they navigate to the wrong
  // workspace before hydration lands.
  it("reads the persisted slug synchronously, without waiting for a mount", async () => {
    localStorage.setItem(LAST_WORKSPACE_STORAGE_KEY, JSON.stringify("beta"));

    const { lastWorkspaceSlugAtom } = await import("./state");

    expect(createStore().get(lastWorkspaceSlugAtom)).toBe("beta");
  });

  it("defaults to null when nothing is stored", async () => {
    const { lastWorkspaceSlugAtom } = await import("./state");

    expect(createStore().get(lastWorkspaceSlugAtom)).toBeNull();
  });

  it("drops the stored key on RESET, so logout leaves nothing behind", async () => {
    localStorage.setItem(LAST_WORKSPACE_STORAGE_KEY, JSON.stringify("beta"));

    const { lastWorkspaceSlugAtom } = await import("./state");
    const store = createStore();
    store.set(lastWorkspaceSlugAtom, RESET);

    expect(localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY)).toBeNull();
    expect(store.get(lastWorkspaceSlugAtom)).toBeNull();
  });
});
