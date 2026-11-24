import { ROLE_TYPES } from "@/routes/members/role-list/components/role-list-table/role-type-cell";
import { Badge } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { getBadgeColor } from "@repo/ui/utils";
import { useRoleLabel } from "@/routes/members/hooks/use-role-label";

type MembersRoleCellProps = React.ComponentPropsWithoutRef<typeof Badge> & {
  memberRole: Pick<RoleGetResponseDto, "name" | "type">;
};

/** Role badge; its colour is derived from the role name and type. */
export const MembersRoleCell = ({
  memberRole,
  ...rest
}: MembersRoleCellProps) => {
  const roleLabel = useRoleLabel();
  const { icon: RoleIcon } = ROLE_TYPES[memberRole.type];
  const { label } = roleLabel(memberRole);

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
