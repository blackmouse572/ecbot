import "@/i18n";
import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

import { MarketplaceCustomCallout } from "./marketplace-custom-callout";

describe("MarketplaceCustomCallout", () => {
  it("sends developers to set up their own tool", async () => {
    await i18n.changeLanguage("en");
    render(
      <MemoryRouter>
        <MarketplaceCustomCallout />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Set up yourself" }),
    ).toHaveAttribute("href", "/acme/tools/new");
  });
});
