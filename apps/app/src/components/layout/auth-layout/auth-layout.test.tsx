import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { tokenAtom } from "@/modules/auth/state";
import { AuthLayout } from "./auth-layout";

vi.mock("./auth-hero", () => ({ AuthHero: () => null }));

function renderSignedIn(url: string) {
  const store = createStore();
  store.set(tokenAtom, "token");
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<p>login page</p>} />
          </Route>
          <Route path="/" element={<p>home page</p>} />
          <Route path="/join" element={<p>join page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("AuthLayout", () => {
  it("sends a signed-in user to the login redirect, so an invite link survives login", () => {
    renderSignedIn("/login?redirect=%2Fjoin%3Ftokens%3Da.b.c");

    expect(screen.getByText("join page")).toBeInTheDocument();
  });

  it("goes home when there is no redirect", () => {
    renderSignedIn("/login");

    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("ignores a redirect to another site", () => {
    renderSignedIn("/login?redirect=%2F%2Fevil.example");

    expect(screen.getByText("home page")).toBeInTheDocument();
  });
});
