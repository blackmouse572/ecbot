import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api/invitations", () => ({
  useInvitations: vi.fn(),
  useUpdateInvitationRole: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRevokeInvitation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock("@/hooks/api/workspace-roles", () => ({
  useWorkspaceRoles: vi.fn(() => ({ roles: [] })),
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

    render(<Invitations />);

    expect(screen.getByText("a@mail.com")).toBeInTheDocument();
  });

  it("renders empty state when there are no invitations", () => {
    vi.mocked(useInvitations).mockReturnValue({
      invitations: [],
      isLoading: false,
    } as A);

    render(<Invitations />);

    expect(screen.getByText("members.invitations.empty")).toBeInTheDocument();
  });
});
