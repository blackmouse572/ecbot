import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }),
}));

import { StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("explains the status on hover and links to the docs", async () => {
    render(
      <TooltipProvider>
        <StatusPill
          conversation={
            {
              id: "c1",
              status: "OPEN",
              botEnabled: false,
              handoffAt: "x",
            } as never
          }
        />
      </TooltipProvider>,
    );

    await userEvent.hover(screen.getByText("conversations.status.needsYou"));

    expect(
      (await screen.findAllByText("conversations.status.hint.needsYou"))[0],
    ).toBeInTheDocument();
    const link = screen.getAllByRole("link", {
      name: "conversations.status.learnMore",
    })[0];
    expect(link).toHaveAttribute(
      "href",
      expect.stringMatching(/\/vi\/docs\/customers#conversation-statuses$/),
    );
  });
});
