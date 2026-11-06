import { useAbility } from "@repo/auth";

/**
 * Whether the signed-in user may call the API's owner-only workspace routes
 * (WorkspaceOwnerProtected). Only the owner holds "manage all" in a
 * workspace (PolicyAbilityFactory); the built-in Admin role does not.
 */
export const useIsWorkspaceOwner = () => useAbility().can("manage", "all");
