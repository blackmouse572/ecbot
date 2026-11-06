import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { DEFAULT_MEMBER_ROLE_NAME, ROLE_OPTIONS_PER_PAGE } from "../constants";

/**
 * Roles an invitation may carry: every active workspace role except Owner,
 * matching what the invite and role-change endpoints accept. The default is
 * the built-in Member role, which the API also grants when an invitation has
 * no role.
 */
export function useInvitableRoles() {
  const { roles, ...rest } = useWorkspaceRoles({
    perPage: ROLE_OPTIONS_PER_PAGE,
  });
  const invitableRoles = roles.filter(
    (role) => role.isActive && role.type !== "WORKSPACE_OWNER",
  );
  const defaultRoleId = invitableRoles.find(
    (role) =>
      role.type === "WORKSPACE_MEMBER" &&
      role.name === DEFAULT_MEMBER_ROLE_NAME,
  )?.id;

  return { roles: invitableRoles, defaultRoleId, ...rest };
}
