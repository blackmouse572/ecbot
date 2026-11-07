import { useMe } from "@/hooks/api";
import { useAbility } from "@repo/auth";

/**
 * The ability signal for routes the API gates with WorkspaceOwnerProtected.
 * It reads "manage all", which the owner holds in a workspace and the
 * built-in Admin role does not. A super admin (or a role granted manage/all)
 * also reads true; the owner guard then answers 400 5208, which
 * `isNoPermissionError` maps to the same no-permission state.
 *
 * `isPending` is true until the workspace profile loads: the ability is
 * empty until then, so callers show loading rather than "no permission".
 */
export const useIsWorkspaceOwner = () => {
  const ability = useAbility();
  const { isPending } = useMe();

  return { isOwner: !isPending && ability.can("manage", "all"), isPending };
};
