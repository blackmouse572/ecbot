import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api/invitations", () => ({
  useInvitations: vi.fn(),
  useUpdateInvitationRole: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRevokeInvitation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock("@/hooks/api/workspace-roles", () => ({
  useWorkspaceRoles: vi.fn(() => ({
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
  })),
}));

vi.mock("../members-list/components/member-invite-dialog", () => ({
  MemberInviteDialog: ({ open }: { open: boolean }) =>
    open ? <div>invite-dialog</div> : null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useInvitations } from "@/hooks/api/invitations";
import { Invitations } from "./invitations";

describe("Invitations page", () => {
  it("renders invitee emails", () => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [
        { id: "i1", inviteeEmail: "a@mail.com", role: "r1", status: "PENDING" },
      ],
      isLoading: false,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(screen.getByText("a@mail.com")).toBeInTheDocument();
  });

  it("labels the role select and shows each invitation's role", () => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [
        {
          id: "i1",
          inviteeEmail: "a@mail.com",
          role: "r-admin",
          status: "PENDING",
        },
      ],
      isLoading: false,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(screen.getByText("fields.role")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "fields.role" }),
    ).toHaveTextContent("Admin");
  });

  // Accept grants the built-in Member role when the invitation has none.
  it("shows the Member default for an invitation with no role", () => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [
        { id: "i1", inviteeEmail: "a@mail.com", status: "PENDING" },
      ],
      isLoading: false,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole("combobox", { name: "fields.role" }),
    ).toHaveTextContent("members.invitations.defaultRole");
  });

  it.each(["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"])(
    "shows readable text for the %s status, not the raw enum",
    (status) => {
      vi.mocked(useInvitations).mockReturnValue({
        invitations: [{ id: "i1", inviteeEmail: "a@mail.com", status }],
        isLoading: false,
      } as A);

      render(<Invitations />, { wrapper: MemoryRouter });

      expect(
        screen.getByText(`members.invitations.status.${status}`),
      ).toBeInTheDocument();
      expect(screen.queryByText(status)).not.toBeInTheDocument();
    },
  );

  it("renders empty state when there are no invitations", () => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [],
      isLoading: false,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(screen.getByText("members.invitations.empty")).toBeInTheDocument();
    expect(
      screen.getByText("members.invitations.emptyTitle"),
    ).toBeInTheDocument();
  });

  it("throws instead of showing the empty state when loading fails", () => {
    const error = new Error("boom");
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [],
      isLoading: false,
      isError: true,
      error,
    } as A);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Invitations />, { wrapper: MemoryRouter })).toThrow(
      error,
    );
  });

  it("opens the invite dialog from the empty state", () => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [],
      isLoading: false,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });
    fireEvent.click(
      screen.getByRole("button", { name: "members.inviteMember.action" }),
    );

    expect(screen.getByText("invite-dialog")).toBeInTheDocument();
  });
});
