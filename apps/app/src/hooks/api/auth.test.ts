import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { logoutFn, setAuthFn, setLastWorkspaceSlugFn, navigateFn } =
  vi.hoisted(() => ({
    logoutFn: vi.fn(),
    setAuthFn: vi.fn(),
    setLastWorkspaceSlugFn: vi.fn(),
    navigateFn: vi.fn(),
  }));

vi.mock("@repo/client", () => ({
  authSharedControllerLogoutV1: logoutFn,
}));

vi.mock("@/modules/auth", () => ({
  useAuth: () => [null, setAuthFn],
  logoutGuard: { current: false },
}));

vi.mock("@/modules/workspace", () => ({
  useSetLastWorkspaceSlug: () => setLastWorkspaceSlugFn,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateFn };
});

import { logoutGuard } from "@/modules/auth";
import { useLogout } from "./auth";

const wrapper = ({ children }: PropsWithChildren) => {
  const client = new QueryClient();
  return createElement(
    MemoryRouter,
    null,
    createElement(QueryClientProvider, { client }, children),
  );
};

describe("useLogout", () => {
  beforeEach(() => {
    logoutFn.mockReset();
    setAuthFn.mockReset();
    setLastWorkspaceSlugFn.mockReset();
    navigateFn.mockReset();
    logoutGuard.current = false;
  });

  it("calls the server logout endpoint before clearing local state", async () => {
    const callOrder: string[] = [];
    logoutFn.mockImplementation(async () => {
      callOrder.push("server");
    });
    setAuthFn.mockImplementation(() => callOrder.push("clear"));

    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current();

    expect(callOrder).toEqual(["server", "clear"]);
    expect(logoutFn).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: true }),
    );
    expect(setAuthFn).toHaveBeenCalledWith(null);
    expect(navigateFn).toHaveBeenCalledWith("/login");
  });

  it("sets logoutGuard while the server call is in flight so the 401 interceptor cannot race it", async () => {
    let guardDuringCall: boolean | undefined;
    logoutFn.mockImplementation(async () => {
      guardDuringCall = logoutGuard.current;
    });

    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current();

    expect(guardDuringCall).toBe(true);
    expect(logoutGuard.current).toBe(false);
  });

  it("still clears local state and navigates when the server call fails", async () => {
    logoutFn.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current();

    expect(setAuthFn).toHaveBeenCalledWith(null);
    expect(navigateFn).toHaveBeenCalledWith("/login");
    expect(logoutGuard.current).toBe(false);
  });

  it("navigates to a custom destination when provided", async () => {
    logoutFn.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current({ to: "/goodbye" });

    expect(navigateFn).toHaveBeenCalledWith("/goodbye");
  });
});
