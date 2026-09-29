import { ROLE_TYPES } from "@/routes/members/role-list/components/role-list-table/role-type-cell";
import { Badge } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { getBadgeColor } from "@repo/ui/utils";
import { useTranslation } from "react-i18next";

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
  // The owner role is generated as "Owner - <workspace>"; show its type.
  const label =
    memberRole.type === "WORKSPACE_OWNER"
      ? t("roles.types.workspaceOwner")
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
