import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const accessQuery = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/api/tools", () => ({
  useGetToolkitAccess: accessQuery,
}));

import { ToolkitAccessSection } from "./toolkit-access-section";

const actions = Array.from({ length: 10 }, (_, i) => ({
  name: `GOOGLESHEETS_ACTION_${i}`,
  description: `Action ${i}`,
  destructive: i === 0,
}));

const access = (overrides: object = {}) => ({
  access: {
    provider: "composio",
    actions,
    scopes: [],
    requiresSignIn: false,
    ...overrides,
  },
  isLoading: false,
  isError: false,
});

// #189: the page said nothing about what the toolkit does or the access
// Google would ask for.
describe("ToolkitAccessSection", () => {
  beforeEach(() => accessQuery.mockReset());

  const renderSection = () =>
    render(
      <ToolkitAccessSection
        workspaceSlug="kunmart"
        slug="googlesheets"
        name="Google Sheets"
      />,
    );

  it("lists the requested access and warns it can be broad", () => {
    accessQuery.mockReturnValue(
      access({
        scopes: ["https://www.googleapis.com/auth/drive"],
        requiresSignIn: true,
      }),
    );

    renderSection();

    expect(
      screen.getByText("https://www.googleapis.com/auth/drive"),
    ).toBeTruthy();
    expect(screen.getByText(/It can be broader than the actions/)).toBeTruthy();
    expect(screen.getByText(/opens the Google Sheets sign-in/)).toBeTruthy();
  });

  it("previews the actions, flags destructive ones, and expands to all", () => {
    accessQuery.mockReturnValue(access());

    renderSection();

    expect(screen.getByText("What it can do (10)")).toBeTruthy();
    expect(screen.queryByText("GOOGLESHEETS_ACTION_9")).toBeNull();
    expect(screen.getByText("Can delete data")).toBeTruthy();

    fireEvent.click(screen.getByText("Show all 10"));

    expect(screen.getByText("GOOGLESHEETS_ACTION_9")).toBeTruthy();
  });

  // An API-key toolkit has no scopes but still leaves the page to sign in.
  it("warns about leaving the page whenever install needs a sign-in", () => {
    accessQuery.mockReturnValue(access({ requiresSignIn: true }));

    renderSection();

    expect(screen.getByText(/opens the Google Sheets sign-in/)).toBeTruthy();
  });

  it("shows Composio's readable action name", () => {
    accessQuery.mockReturnValue(
      access({
        actions: [
          {
            name: "GOOGLESHEETS_BATCH_GET",
            label: "Batch get spreadsheet",
            description: "Read ranges",
            destructive: false,
          },
        ],
      }),
    );

    renderSection();

    expect(screen.getByText("Batch get spreadsheet")).toBeTruthy();
  });

  it("does not blame Composio for an Ecbot tool's empty list", () => {
    accessQuery.mockReturnValue(access({ provider: "eccho", actions: [] }));

    renderSection();

    expect(
      screen.getByText(
        "This Ecbot tool lists its actions after you install it.",
      ),
    ).toBeTruthy();
  });

  it("says so when the list cannot load", () => {
    accessQuery.mockReturnValue({
      access: undefined,
      isLoading: false,
      isError: true,
    });

    renderSection();

    expect(
      screen.getByText("Could not load what this toolkit can do."),
    ).toBeTruthy();
  });
});
