import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const updateStatus = vi.fn(() => Promise.resolve());
const toastPromise = vi.fn();
vi.mock("@medusajs/ui", async (orig) => ({
  ...(await orig<typeof import("@medusajs/ui")>()),
  toast: { promise: (...args: unknown[]) => toastPromise(...args) },
}));
vi.mock("@/hooks/api/conversations", () => ({
  useUpdateConversationBot: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateConversationStatus: () => ({
    mutateAsync: updateStatus,
    isPending: false,
  }),
}));

import { BotPauseSwitch } from "./status-actions-menu";

const conversation = (botEnabled: boolean) =>
  ({ id: "c1", status: "OPEN", botEnabled }) as never;

describe("BotPauseSwitch", () => {
  it("shows the bot switch while the bot is answering", () => {
    render(<BotPauseSwitch conversation={conversation(true)} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("offers Resolve instead of the switch once the bot handed over", async () => {
    render(<BotPauseSwitch conversation={conversation(false)} />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "conversations.actions.resolve" }),
    );
    // The open dialog sets pointer-events: none on the page behind it.
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "conversations.actions.resolve",
      }),
    );
    expect(updateStatus).toHaveBeenCalledWith({ status: "RESOLVED" });
    // Progress is announced, so the closed dialog never leaves a silent wait.
    expect(toastPromise).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        loading: "conversations.actions.resolving",
        success: "conversations.actions.resolved",
        error: "conversations.actions.resolveFailed",
      }),
    );
  });
});
