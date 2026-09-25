import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unlinkAccountsMock = vi.fn();
const linkChatbotAccount = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: { name?: string }) => (opts?.name ? `${key} ${opts.name}` : key) }),
}));

vi.mock("@/hooks/api", () => ({
  useUnlinkAccounts: (...args: unknown[]) => unlinkAccountsMock(...args),
}));

vi.mock("@/hooks/api/chatbot", () => ({
  useLinkChatbotAccount: () => ({ mutateAsync: linkChatbotAccount, isPending: false }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual = await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

import { toast } from "@medusajs/ui";
import { AccountLinkDrawer } from "./account-link-drawer";

const onClose = vi.fn();

beforeEach(() => {
  unlinkAccountsMock.mockReset().mockReturnValue({ accounts: [] });
  linkChatbotAccount.mockReset();
  onClose.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("AccountLinkDrawer", () => {
  it("excludes user-level FACEBOOK_ACCOUNT rows (only pages are a channel)", () => {
    unlinkAccountsMock.mockReturnValue({
      accounts: [
        { id: "acc-user", name: "Owner Account", type: "FACEBOOK_ACCOUNT" },
        { id: "acc-page", name: "Lotus Page", type: "FACEBOOK_PAGE" },
      ],
    });
    render(<AccountLinkDrawer isOpen chatbotId="bot-1" onClose={onClose} />);
    expect(screen.queryByText("Owner Account")).not.toBeInTheDocument();
    expect(screen.getByText("Lotus Page")).toBeInTheDocument();
  });

  it("shows a success toast and closes when the id comes back under linked", async () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-1", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }] });
    linkChatbotAccount.mockResolvedValue({ data: { data: { linked: ["acc-1"], skipped: [] } } });

    const user = userEvent.setup();
    render(<AccountLinkDrawer isOpen chatbotId="bot-1" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "actions.add" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("chatbot.details.accountLinked"));
    expect(toast.error).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error toast (not success) and does not close when the id comes back skipped", async () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-1", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }] });
    linkChatbotAccount.mockResolvedValue({
      data: { data: { linked: [], skipped: [{ id: "acc-1", name: "Lotus Zalo" }] } },
    });

    const user = userEvent.setup();
    render(<AccountLinkDrawer isOpen chatbotId="bot-1" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "actions.add" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("agentBuilder.ui.channelInUse Lotus Zalo"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the generic failure toast when the mutation itself rejects", async () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-1", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }] });
    linkChatbotAccount.mockRejectedValue(new Error("down"));

    const user = userEvent.setup();
    render(<AccountLinkDrawer isOpen chatbotId="bot-1" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "actions.add" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("chatbot.details.accountLinkFailed"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
