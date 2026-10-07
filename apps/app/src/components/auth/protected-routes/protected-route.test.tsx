import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authToken = { current: null as string | null };
vi.mock("@/components/layout/impersonation-banner", () => ({
  ImpersonationBanner: () => <p>impersonation-banner</p>,
}));
vi.mock("@repo/ui/layout", () => ({
  SidebarProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  NavAccessProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock("@repo/auth", () => ({
  AbilityProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock("@/hooks/api/workspace", () => ({
  useWorkspaceList: () => ({ workspaces: [], isLoading: false }),
}));
vi.mock("@/modules/auth", async () => ({
  ...(await vi.importActual<typeof import("@/modules/auth/login-redirect")>(
    "@/modules/auth/login-redirect",
  )),
  useAuthToken: () => authToken.current,
  useRefreshTokenEffect: () => {},
  useUserAbility: () => ({ can: () => false }),
}));

import { ProtectedRoute } from "./protected-route";

const LoginProbe = () => {
  const location = useLocation();
  return <p>{new URLSearchParams(location.search).get("redirect")}</p>;
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authToken.current = null;
  });

  it("sends a logged-out invite link to login with its token kept", () => {
    render(
      <MemoryRouter initialEntries={["/join?tokens=a.b.c"]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/join" element={<p>join</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("/join?tokens=a.b.c")).toBeInTheDocument();
  });

  it("shows the impersonation banner on onboard routes too", () => {
    authToken.current = "token";
    render(
      <MemoryRouter initialEntries={["/onboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/onboard" element={<p>onboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("onboard")).toBeInTheDocument();
    expect(screen.getByText("impersonation-banner")).toBeInTheDocument();
  });
});
