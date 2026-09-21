import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PolicyAbilityFactory } from "@repo/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { promptFn, logoutFn, refreshMutateAsync, requestFn, mockUseMe } =
  vi.hoisted(() => ({
    promptFn: vi.fn(),
    logoutFn: vi.fn(),
    refreshMutateAsync: vi.fn(),
    requestFn: vi.fn(),
    mockUseMe: vi.fn(),
  }));

let capturedErrorHandler: ((error: A) => A) | null = null;

vi.mock("@repo/client", () => ({
  client: {
    instance: {
      interceptors: {
        response: {
          use: vi.fn((_success: A, errorHandler: A) => {
            capturedErrorHandler = errorHandler;
            return 1;
          }),
          eject: vi.fn(),
        },
      },
      request: requestFn,
    },
  },
}));

vi.mock("@medusajs/ui", () => ({
  usePrompt: () => promptFn,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@repo/auth", () => ({
  PolicyAbilityFactory: { createForUser: vi.fn(), createForMember: vi.fn() },
  useAbility: () => ({}),
}));

vi.mock("@/hooks/api", () => ({
  useLogout: () => logoutFn,
  useMe: () => mockUseMe(),
  useRefreshToken: () => ({ mutateAsync: refreshMutateAsync }),
  USER_BLOCKED_FORBIDDEN_STATUS_CODE: 5159,
}));

import { useRefreshTokenEffect, useUserAbility } from "./hooks";
import { logoutGuard } from "./state";

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(MemoryRouter, null, children);

const fakeAxiosError = {
  response: { status: 401 },
  request: { responseURL: "/api/v1/user/notification/list" },
  config: { headers: {} },
};

describe("useRefreshTokenEffect", () => {
  beforeEach(() => {
    promptFn.mockReset();
    logoutFn.mockReset();
    refreshMutateAsync.mockReset();
    requestFn.mockReset();
    capturedErrorHandler = null;
    logoutGuard.current = false;
  });

  it("awaits the banned alert modal before logging out when refresh fails with BLOCKED_FORBIDDEN", async () => {
    refreshMutateAsync.mockResolvedValue({
      data: null,
      error: { statusCode: 5159, message: "user.error.blocked" },
    });
    promptFn.mockResolvedValue(true);

    renderHook(() => useRefreshTokenEffect(), { wrapper });
    expect(capturedErrorHandler).toBeTruthy();

    await capturedErrorHandler!(fakeAxiosError).catch(() => {});

    expect(promptFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "app.auth.login.errors.banned.title",
        description: "app.auth.login.errors.banned.description",
        confirmText: "app.auth.login.actions.ok",
      }),
    );
    expect(logoutFn).toHaveBeenCalledTimes(1);
    // modal must resolve before logout, not run concurrently with it
    expect(promptFn.mock.invocationCallOrder[0]).toBeLessThan(
      logoutFn.mock.invocationCallOrder[0],
    );
  });

  it("logs out without the modal for a non-banned refresh failure", async () => {
    refreshMutateAsync.mockResolvedValue({
      data: null,
      error: { statusCode: 401, message: "session expired" },
    });

    renderHook(() => useRefreshTokenEffect(), { wrapper });
    expect(capturedErrorHandler).toBeTruthy();

    await capturedErrorHandler!(fakeAxiosError).catch(() => {});

    expect(logoutFn).toHaveBeenCalledTimes(1);
    expect(promptFn).not.toHaveBeenCalled();
    // logout() is async and navigates to "/login" itself once the server
    // round-trip resolves — a separate synchronous go(...) call right after
    // firing logout() would win the race and then get clobbered by that
    // trailing bare "/login". The redirect must be routed through logout's
    // own `{ to }` param instead of a second, independent navigation.
    expect(logoutFn).toHaveBeenCalledWith({ to: "/login?redirect=/" });
  });

  it("does not crash when the error has no request object (defensive optional chaining)", async () => {
    requestFn.mockResolvedValue({ data: {} });
    refreshMutateAsync.mockResolvedValue({
      data: {
        data: {
          tokenType: "Bearer",
          roleType: "USER",
          expiresIn: 15,
          accessToken: "new-token",
        },
      },
    });

    renderHook(() => useRefreshTokenEffect(), { wrapper });
    expect(capturedErrorHandler).toBeTruthy();

    const errorWithoutRequest = {
      response: { status: 401 },
      config: { headers: {} },
    };
    await capturedErrorHandler!(errorWithoutRequest);

    expect(refreshMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("never logs the access token to the console on a successful refresh", async () => {
    requestFn.mockResolvedValue({ data: {} });
    refreshMutateAsync.mockResolvedValue({
      data: {
        data: {
          tokenType: "Bearer",
          roleType: "USER",
          expiresIn: 15,
          accessToken: "super-secret-access-token",
          refreshToken: "super-secret-refresh-token",
        },
      },
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    renderHook(() => useRefreshTokenEffect(), { wrapper });
    expect(capturedErrorHandler).toBeTruthy();

    await capturedErrorHandler!(fakeAxiosError).catch(() => {});

    for (const spy of [logSpy, infoSpy]) {
      for (const call of spy.mock.calls) {
        for (const arg of call) {
          expect(JSON.stringify(arg)).not.toContain(
            "super-secret-access-token",
          );
        }
      }
    }
    logSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("skips refreshing and rejects immediately when a logout is in flight", async () => {
    logoutGuard.current = true;

    renderHook(() => useRefreshTokenEffect(), { wrapper });
    expect(capturedErrorHandler).toBeTruthy();

    await expect(capturedErrorHandler!(fakeAxiosError)).rejects.toBe(
      fakeAxiosError,
    );

    expect(refreshMutateAsync).not.toHaveBeenCalled();
    expect(logoutFn).not.toHaveBeenCalled();
  });
});

describe("useUserAbility", () => {
  const createForUser = vi.mocked(PolicyAbilityFactory.createForUser);
  const createForMember = vi.mocked(PolicyAbilityFactory.createForMember);

  const globalRole = { permissions: [], type: "USER" };

  beforeEach(() => {
    createForUser.mockReset();
    createForMember.mockReset();
    mockUseMe.mockReturnValue({ user: null, isPending: false });
  });

  it("passes the explicit owner flag for an owner with no membership row", () => {
    mockUseMe.mockReturnValue({
      user: { ...baseProfile(), isOwner: true },
      isPending: false,
    });

    renderHook(() => useUserAbility(), { wrapper });

    expect(createForUser).toHaveBeenCalledWith([], "USER", true);
  });

  it("passes the explicit owner flag through the member branch", () => {
    mockUseMe.mockReturnValue({
      user: {
        ...baseProfile(),
        isOwner: true,
        workspaceMember: {
          role: { permissions: [], type: "WORKSPACE_MEMBER" },
        },
      },
      isPending: false,
    });

    renderHook(() => useUserAbility(), { wrapper });

    expect(createForMember).toHaveBeenCalledWith(
      [],
      "WORKSPACE_MEMBER",
      true,
    );
  });

  it("infers ownership on a workspace route when the flag is absent", () => {
    mockUseMe.mockReturnValue({
      user: baseProfile(),
      isPending: false,
    });

    renderHook(() => useUserAbility(), { wrapper: slugWrapper });

    expect(createForUser).toHaveBeenCalledWith([], "USER", true);
  });

  it("does not grant ownership for a global profile without the flag", () => {
    mockUseMe.mockReturnValue({
      user: baseProfile(),
      isPending: false,
    });

    renderHook(() => useUserAbility(), { wrapper });

    expect(createForUser).toHaveBeenCalledWith([], "USER", false);
  });

  function baseProfile() {
    return { role: { ...globalRole } };
  }

  function slugWrapper({ children }: PropsWithChildren) {
    return createElement(
      MemoryRouter,
      { initialEntries: ["/w/acme/overview"] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/w/:workspaceSlug/*",
          element: children,
        }),
      ),
    );
  }
});
