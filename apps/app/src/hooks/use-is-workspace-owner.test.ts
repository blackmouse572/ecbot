import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isPending: false, manageAll: true }));
vi.mock("@/hooks/api", () => ({
  useMe: () => ({ isPending: state.isPending }),
}));
vi.mock("@repo/auth", () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      state.manageAll && action === "manage" && subject === "all",
  }),
}));

import { useIsWorkspaceOwner } from "./use-is-workspace-owner";

describe("useIsWorkspaceOwner", () => {
  beforeEach(() => {
    state.isPending = false;
    state.manageAll = true;
  });

  it("is the owner with manage all once the profile loaded", () => {
    const { result } = renderHook(() => useIsWorkspaceOwner());

    expect(result.current).toEqual({ isOwner: true, isPending: false });
  });

  it("is not the owner without manage all", () => {
    state.manageAll = false;
    const { result } = renderHook(() => useIsWorkspaceOwner());

    expect(result.current).toEqual({ isOwner: false, isPending: false });
  });

  it("reports pending, not a refusal, while the profile loads", () => {
    state.isPending = true;
    const { result } = renderHook(() => useIsWorkspaceOwner());

    expect(result.current).toEqual({ isOwner: false, isPending: true });
  });
});
