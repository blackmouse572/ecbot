import type { useMe } from "@/hooks/api";
import { useTranslation } from "react-i18next";

/**
 * "Owner", "Admin", "Member" or a custom role's name, for the switcher.
 * Admin and Member are the roles every workspace is created with (apps/api
 * workspace.constant.ts), so they are translated; custom roles keep their name.
 */
export const useWorkspaceRoleLabel = (
  user: ReturnType<typeof useMe>["user"] | undefined,
): string | undefined => {
  const { t } = useTranslation();
  if (!user) return undefined;
  if ("isOwner" in user && user.isOwner) {
    return t("workspace.switcher.roles.owner");
  }
  const name =
    "workspaceMember" in user ? user.workspaceMember?.role?.name : undefined;
  if (name === "Admin") return t("workspace.switcher.roles.admin");
  if (name === "Member") return t("workspace.switcher.roles.member");
  return name || undefined;
};
