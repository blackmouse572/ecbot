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
      {
        id: "r-owner",
        name: "Owner - Shop",
        type: "WORKSPACE_OWNER",
        isActive: true,
      },
      {
        id: "r-admin",
        name: "Admin",
        type: "WORKSPACE_MEMBER",
        isActive: true,
      },
      {
        id: "r-member",
        name: "Member",
        type: "WORKSPACE_MEMBER",
        isActive: true,
      },
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

  it("hides the people found heading when nobody is found", () => {
    renderDialog();

    expect(screen.queryByText("People found")).not.toBeInTheDocument();
  });

  it("asks for an email address and shows people found directly", () => {
    invitableUsers.current = [
      { id: "u-1", name: "Lan", email: "lan@example.com" },
    ];
    renderDialog();

    expect(screen.getByText("lan@example.com")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Enter an email address"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Type the full email address/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("People found")).toBeInTheDocument();
  });

  it("invites as Member and names the invitee", async () => {
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

  // The role is changed on the invited row, not picked before inviting.
  it("has no role select above the search", () => {
    renderDialog();

    expect(screen.queryByRole("combobox", { name: "Role" })).toBeNull();
  });

  it("clears the search after an invite so the new invitation shows", async () => {
    inviteUser.mockResolvedValue({});
    renderDialog();
    const input = screen.getByPlaceholderText("Enter an email address");
    fireEvent.change(input, { target: { value: "new@maybakery.vn" } });
    // The search is debounced.
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));

    await act(async () => {
      fireEvent.click(
        (
          await screen.findByText(
            "new@maybakery.vn",
            { selector: "p" },
            { timeout: 3000 },
          )
        )
          .closest("[cmdk-item]")!
          .querySelector("button")!,
      );
    });

    expect(inviteUser).toHaveBeenCalledWith({
      invitedEmail: "new@maybakery.vn",
      roleId: "r-member",
    });
    expect(input).toHaveValue("");
  });

  it("shows key hints for closing and moving, not a close button", () => {
    renderDialog();

    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("esc")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("↑")).toBeInTheDocument();
    expect(screen.getByText("↓")).toBeInTheDocument();
    expect(screen.getByText("Move")).toBeInTheDocument();
  });

  it("closes on the Escape key", () => {
    const onOpenChange = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <MemberInviteDialog open onOpenChange={onOpenChange} />
      </I18nextProvider>,
    );

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls the code a join code", async () => {
    copy.mockResolvedValue(true);
    renderDialog();

    expect(screen.getByText(/Join code/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy join code" }));
    });

    expect(copy).toHaveBeenCalledWith("ABC123");
    expect(await screen.findByText("Join code copied.")).toBeInTheDocument();
  });
});
