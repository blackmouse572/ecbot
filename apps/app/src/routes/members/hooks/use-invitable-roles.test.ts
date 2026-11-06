import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
      { id: "r-sales", name: "Sales", type: "USER", isActive: true },
      { id: "r-old", name: "Old", type: "USER", isActive: false },
    ],
  }),
}));

import { useInvitableRoles } from "./use-invitable-roles";

describe("useInvitableRoles", () => {
  // The API refuses inactive roles on invite and on role change.
  it("never offers the Owner role or an inactive role", () => {
    const { result } = renderHook(() => useInvitableRoles());

    expect(result.current.roles.map((role) => role.id)).toEqual([
      "r-admin",
      "r-member",
      "r-sales",
    ]);
  });

  // Admin shares the WORKSPACE_MEMBER type, so the default is picked by name.
  it("defaults to the built-in Member role, not Admin", () => {
    const { result } = renderHook(() => useInvitableRoles());

    expect(result.current.defaultRoleId).toBe("r-member");
  });
});
