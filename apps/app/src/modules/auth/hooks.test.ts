import { act, renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { PolicyAbilityFactory } from "@repo/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { promptFn, logoutFn, mockUseMe, endImpersonation, setHandlers } =
  vi.hoisted(() => ({
    promptFn: vi.fn(),
    logoutFn: vi.fn(),
    mockUseMe: vi.fn(),
    endImpersonation: vi.fn(),
    setHandlers: vi.fn(),
  }));

vi.mock("./response-interceptor", () => ({
  setAuthSessionHandlers: setHandlers,
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
  USER_BLOCKED_FORBIDDEN_STATUS_CODE: 5159,
}));

vi.mock("@/modules/impersonation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/impersonation/state")>()),
  useEndImpersonation: () => endImpersonation,
}));

import type { AuthSessionHandlers } from "./response-interceptor";
import { useRefreshTokenEffect, useUserAbility } from "./hooks";

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(MemoryRouter, null, children);

const installedHandlers = () =>
  setHandlers.mock.calls.at(-1)![0] as AuthSessionHandlers;

describe("useRefreshTokenEffect", () => {
  beforeEach(() => {
    promptFn.mockReset();
    logoutFn.mockReset();
    endImpersonation.mockReset();
    setHandlers.mockReset();
  });

  it("installs the session handlers on mount and restores the defaults on unmount", () => {
    const { unmount } = renderHook(() => useRefreshTokenEffect(), { wrapper });
    expect(installedHandlers()).toEqual(
      expect.objectContaining({
        onSessionExpired: expect.any(Function),
        onImpersonationExpired: expect.any(Function),
      }),
    );

    unmount();
    expect(setHandlers).toHaveBeenLastCalledWith(null);
  });

  it("awaits the banned alert modal before logging out when refresh fails with BLOCKED_FORBIDDEN", async () => {
    promptFn.mockResolvedValue(true);
    renderHook(() => useRefreshTokenEffect(), { wrapper });

    await installedHandlers().onSessionExpired(5159);

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

  it("logs out to /login with a return path, without the modal, for a non-banned refresh failure", async () => {
    renderHook(() => useRefreshTokenEffect(), { wrapper });

    await installedHandlers().onSessionExpired(401);

    expect(promptFn).not.toHaveBeenCalled();
    // The redirect goes through logout's own `{ to }`: a separate navigate
    // fired right after would be clobbered by logout's trailing one.
    expect(logoutFn).toHaveBeenCalledWith({ to: "/login?redirect=%2F" });
  });

  it("sends the user back to the page they are on now, not the first one", async () => {
    let go: (to: string) => void = () => {};
    const routerWrapper = ({ children }: PropsWithChildren) =>
      createElement(
        MemoryRouter,
        { initialEntries: ["/first"] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: "*", element: children }),
        ),
      );

    renderHook(
      () => {
        useRefreshTokenEffect();
        go = useNavigate();
      },
      { wrapper: routerWrapper },
    );
    act(() => go("/kunmart/inbox?c=1"));

    await installedHandlers().onSessionExpired(null);

    expect(logoutFn).toHaveBeenCalledWith({
      to: "/login?redirect=%2Fkunmart%2Finbox%3Fc%3D1",
    });
  });

  it("ends the impersonation when an impersonated session expires", () => {
    renderHook(() => useRefreshTokenEffect(), { wrapper });

    installedHandlers().onImpersonationExpired();

    expect(endImpersonation).toHaveBeenCalledWith();
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

    expect(createForMember).toHaveBeenCalledWith([], "WORKSPACE_MEMBER", true);
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
