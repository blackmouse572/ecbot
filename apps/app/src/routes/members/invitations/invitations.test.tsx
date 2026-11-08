import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const owner = vi.hoisted(() => ({ isOwner: true, isPending: false }));
vi.mock("@/hooks/use-is-workspace-owner", () => ({
  useIsWorkspaceOwner: () => owner,
}));

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
import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { Invitations } from "./invitations";

const apiError = (status: number, statusCode: number) => ({
  response: { status, data: { statusCode } },
});

describe("Invitations page", () => {
  beforeEach(() => {
    owner.isOwner = true;
    owner.isPending = false;
  });

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

  it("tells a member they can't view invitations, without asking the API", () => {
    owner.isOwner = false;
    vi.mocked(useInvitations).mockReturnValue({
      invitations: undefined,
      isLoading: false,
    } as A);
    vi.mocked(useWorkspaceRoles).mockClear();

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(
      screen.getByText("members.invitations.noReadPermission"),
    ).toBeInTheDocument();
    expect(vi.mocked(useInvitations).mock.lastCall?.[1]).toEqual({
      enabled: false,
    });
    // Roles load only inside a row's role select, and a member gets no rows.
    expect(useWorkspaceRoles).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "members.inviteMember.action" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["the owner guard's 400 5208", apiError(400, 5208)],
    ["a 403", apiError(403, 5100)],
  ])("shows the no-permission message on %s", (_, error) => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: undefined,
      isLoading: false,
      isError: true,
      error,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(
      screen.getByText("members.invitations.noReadPermission"),
    ).toBeInTheDocument();
  });

  it("still throws a suspended workspace's 403 to the error boundary", () => {
    const error = apiError(403, 5215);
    vi.mocked(useInvitations).mockReturnValue({
      invitations: undefined,
      isLoading: false,
      isError: true,
      error,
    } as A);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Invitations />, { wrapper: MemoryRouter })).toThrow();
  });

  it("shows loading, not the no-permission message, while the profile loads", () => {
    owner.isOwner = false;
    owner.isPending = true;
    vi.mocked(useInvitations).mockReturnValue({
      invitations: undefined,
      isLoading: false,
    } as A);

    render(<Invitations />, { wrapper: MemoryRouter });

    expect(screen.getByText("general.loading")).toBeInTheDocument();
    expect(
      screen.queryByText("members.invitations.noReadPermission"),
    ).not.toBeInTheDocument();
  });
});
