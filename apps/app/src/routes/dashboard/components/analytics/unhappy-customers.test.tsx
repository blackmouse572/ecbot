import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { UnhappyCustomers } from "./unhappy-customers";

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "w" }),
}));

describe("UnhappyCustomers", () => {
  it("explains an empty list with a title and a description", () => {
    render(
      <MemoryRouter>
        <UnhappyCustomers rows={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("No unhappy customers")).toBeTruthy();
    expect(
      screen.getByText(
        "Customers the bot marks as unhappy show up here so you can follow up.",
      ),
    ).toBeTruthy();
  });
});
