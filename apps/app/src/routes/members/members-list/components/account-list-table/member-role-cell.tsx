import { ROLE_TYPES } from "@/routes/members/role-list/components/role-list-table/role-type-cell";
import { Badge } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { getBadgeColor } from "@repo/ui/utils";

type MembersRoleCellProps = React.ComponentPropsWithoutRef<typeof Badge> & {
  memberRole: Pick<RoleGetResponseDto, "name" | "type">;
};

/** Role badge; its colour is derived from the role name and type. */
export const MembersRoleCell = ({
  memberRole,
  ...rest
}: MembersRoleCellProps) => {
  const { icon: RoleIcon } = ROLE_TYPES[memberRole.type];

  return (
    <Badge {...rest} color={getBadgeColor(memberRole.name + memberRole.type)}>
      <RoleIcon className="mr-1 inline h-3 w-3" />
      {memberRole.name}
    </Badge>
  );
};
