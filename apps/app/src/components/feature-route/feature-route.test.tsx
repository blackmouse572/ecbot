import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureRoute } from "./feature-route";

const state = vi.hoisted(() => ({
  isLoading: false,
  flags: { orders: true, customerSources: false },
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  useFeatureFlags: () => ({ ...state, isError: false }),
}));
vi.mock("@/routes/not-found/not-found", () => ({
  NotFound: () => "not-found",
}));

const renderAt = (flag: "orders" | "customerSources") =>
  render(
    <MemoryRouter initialEntries={["/lumi/section"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/section"
          element={<FeatureRoute flag={flag} />}
        >
          <Route index element={<p>section page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("FeatureRoute", () => {
  afterEach(() => {
    state.isLoading = false;
  });

  it("renders the section while its flag is on", () => {
    renderAt("orders");
    expect(screen.getByText("section page")).toBeInTheDocument();
  });

  it("shows the not-found page while its flag is off", () => {
    renderAt("customerSources");
    expect(screen.getByText("not-found")).toBeInTheDocument();
    expect(screen.queryByText("section page")).not.toBeInTheDocument();
  });

  it("shows neither until the flags load", () => {
    state.isLoading = true;
    renderAt("orders");
    expect(screen.queryByText("section page")).not.toBeInTheDocument();
    expect(screen.queryByText("not-found")).not.toBeInTheDocument();
  });
});
