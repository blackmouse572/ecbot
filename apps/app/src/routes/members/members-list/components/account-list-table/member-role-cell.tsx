import { ROLE_TYPES } from "@/routes/members/role-list/components/role-list-table/role-type-cell";
import { Badge } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { getBadgeColor } from "@repo/ui/utils";
import { useTranslation } from "react-i18next";
import { DEFAULT_ROLE_LABELS } from "./constants";

type MembersRoleCellProps = React.ComponentPropsWithoutRef<typeof Badge> & {
  memberRole: Pick<RoleGetResponseDto, "name" | "type">;
};

/** Role badge; its colour is derived from the role name and type. */
export const MembersRoleCell = ({
  memberRole,
  ...rest
}: MembersRoleCellProps) => {
  const { t } = useTranslation();
  const { icon: RoleIcon } = ROLE_TYPES[memberRole.type];
  // Roles the API generates carry English names ("Owner - <workspace>",
  // "Member", "Admin"); show them translated. Custom roles keep their name.
  const label =
    memberRole.type === "WORKSPACE_OWNER"
      ? t("roles.types.workspaceOwner")
      : memberRole.type === "WORKSPACE_MEMBER" &&
          memberRole.name in DEFAULT_ROLE_LABELS
        ? t(DEFAULT_ROLE_LABELS[memberRole.name])
        : memberRole.name;

  return (
    <Badge
      color={getBadgeColor(memberRole.name + memberRole.type)}
      className="whitespace-nowrap"
      {...rest}
    >
      <RoleIcon className="mr-1 inline h-3 w-3" />
      {label}
    </Badge>
  );
};
