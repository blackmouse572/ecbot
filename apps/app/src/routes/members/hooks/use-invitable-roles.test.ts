import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api/workspace-roles", () => ({
  useWorkspaceRoles: () => ({
    roles: [
      { id: "r-owner", name: "Owner - Shop", type: "WORKSPACE_OWNER" },
      { id: "r-admin", name: "Admin", type: "WORKSPACE_MEMBER" },
      { id: "r-member", name: "Member", type: "WORKSPACE_MEMBER" },
      { id: "r-sales", name: "Sales", type: "USER" },
    ],
  }),
}));

import { useInvitableRoles } from "./use-invitable-roles";

describe("useInvitableRoles", () => {
  it("never offers the Owner role", () => {
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
