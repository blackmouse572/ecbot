import { Toaster } from "@medusajs/ui";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";

const { inviteUser, invitableUsers, copy } = vi.hoisted(() => ({
  inviteUser: vi.fn(),
  invitableUsers: { current: [] as A[] },
  copy: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useWorkspace: () => ({ workspace: { invitationCode: "ABC123" } }),
  useInvitableUsers: () => ({
    users: invitableUsers.current,
    isLoading: false,
    isFetching: false,
  }),
  useInviteUser: () => ({ mutateAsync: inviteUser }),
}));

vi.mock("@/hooks/api/invitations", () => ({
  useInvitations: () => ({ invitations: [], isLoading: false }),
  useUpdateInvitationRole: () => ({ mutateAsync: vi.fn() }),
  useRevokeInvitation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/api/workspace-roles", () => ({
  useWorkspaceRoles: () => ({
    roles: [
      { id: "r-owner", name: "Owner - Shop", type: "WORKSPACE_OWNER" },
      { id: "r-admin", name: "Admin", type: "WORKSPACE_MEMBER" },
      { id: "r-member", name: "Member", type: "WORKSPACE_MEMBER" },
    ],
  }),
}));

vi.mock("usehooks-ts", async () => {
  const actual =
    await vi.importActual<typeof import("usehooks-ts")>("usehooks-ts");
  return { ...actual, useCopyToClipboard: () => [null, copy] };
});

import { MemberInviteDialog } from "./member-invite-dialog";

// cmdk scrolls the selected item into view; jsdom has no layout.
Element.prototype.scrollIntoView = vi.fn();

const renderDialog = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <Toaster />
      <MemberInviteDialog open onOpenChange={vi.fn()} />
    </I18nextProvider>,
  );

describe("MemberInviteDialog", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    invitableUsers.current = [];
    await i18n.changeLanguage("en");
  });

  it("asks for an email address, not a name", () => {
    renderDialog();

    expect(
      screen.getByPlaceholderText("Enter an email address"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Type the full email address of the person you want to invite.",
      ),
    ).toBeInTheDocument();
  });

  it("has a labelled Role select that defaults to Member", () => {
    renderDialog();

    const role = screen.getByRole("combobox", { name: "Role" });
    expect(role).toHaveTextContent("Member");
  });

  it("sends the picked role with every invite and names the invitee", async () => {
    invitableUsers.current = [
      { id: "u-1", name: "Lan", email: "lan@example.com" },
    ];
    inviteUser.mockResolvedValue({});
    renderDialog();

    await act(async () => {
      fireEvent.click(
        screen
          .getByText("lan@example.com")
          .closest("[cmdk-item]")!
          .querySelector("button")!,
      );
    });

    expect(inviteUser).toHaveBeenCalledWith({
      invitedEmail: "lan@example.com",
      roleId: "r-member",
    });
    expect(
      await screen.findByText("Invitation sent to lan@example.com."),
    ).toBeInTheDocument();
  });

  it("calls the code a join code and says where requests are approved", async () => {
    copy.mockResolvedValue(true);
    renderDialog();

    expect(screen.getByText(/Join code/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Anyone with this code can ask to join from Join a workspace. You approve each request under Team → Join requests.",
      ),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy join code" }));
    });

    expect(copy).toHaveBeenCalledWith("ABC123");
    expect(await screen.findByText("Join code copied.")).toBeInTheDocument();
  });
});
