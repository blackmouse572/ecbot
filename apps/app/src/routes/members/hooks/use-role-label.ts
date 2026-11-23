import type { RoleGetResponseDto } from "@repo/client";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { BUILT_IN_ROLE_LABELS } from "../constants";

type LabelledRole = Pick<RoleGetResponseDto, "name" | "type"> &
  Partial<Pick<RoleGetResponseDto, "description">>;

/**
 * Names a role for display. Roles the API generates carry English names
 * ("Owner - <workspace>", "Sales", ...), so those are translated, with a
 * one-line description for the built-in ones. Custom roles keep their own
 * name and description.
 */
export function useRoleLabel() {
  const { t } = useTranslation();

  return useCallback(
    (role: LabelledRole): { label: string; description?: string } => {
      if (role.type === "WORKSPACE_OWNER")
        return { label: t("roles.types.workspaceOwner") };
      const builtIn =
        role.type === "WORKSPACE_MEMBER"
          ? BUILT_IN_ROLE_LABELS[role.name]
          : undefined;
      if (!builtIn)
        return { label: role.name, description: role.description || undefined };

      return {
        label: t(builtIn.name),
        description: builtIn.description ? t(builtIn.description) : undefined,
      };
    },
    [t],
  );
}
