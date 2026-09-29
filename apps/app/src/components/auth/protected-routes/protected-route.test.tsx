import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api/workspace", () => ({
  useWorkspaceList: () => ({ workspaces: [], isLoading: false }),
}));
vi.mock("@/modules/auth", async () => ({
  ...(await vi.importActual<typeof import("@/modules/auth/login-redirect")>(
    "@/modules/auth/login-redirect",
  )),
  useAuthToken: () => null,
  useRefreshTokenEffect: () => {},
  useUserAbility: () => ({ can: () => false }),
}));

import { ProtectedRoute } from "./protected-route";

const LoginProbe = () => {
  const location = useLocation();
  return <p>{new URLSearchParams(location.search).get("redirect")}</p>;
};

describe("ProtectedRoute", () => {
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
});
