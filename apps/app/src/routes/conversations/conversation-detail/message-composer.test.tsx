import { TooltipProvider } from "@medusajs/ui";
import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MessageComposer } from "./message-composer";

const render = (ui: ReactElement) =>
  rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

describe("MessageComposer", () => {
  it("lets the operator type while Meta's 24h window is open", () => {
    render(<MessageComposer isSending={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(
      screen.queryByText("conversations.composer.windowClosed"),
    ).not.toBeInTheDocument();
  });

  it("names the send button, not the message box, Send", () => {
    render(<MessageComposer isSending={false} onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "actions.send" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).not.toHaveAccessibleName(
      "actions.send",
    );
  });

  it("disables the input under an explanation once the window has closed", () => {
    render(
      <MessageComposer isSending={false} onSubmit={vi.fn()} windowClosed />,
    );
    expect(screen.getByRole("textbox", { hidden: true })).toBeDisabled();
    expect(
      screen.getByText("conversations.composer.windowClosed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "conversations.reactions.policyLink" }),
    ).toHaveAttribute("href", expect.stringContaining("facebook.com"));
  });
});
