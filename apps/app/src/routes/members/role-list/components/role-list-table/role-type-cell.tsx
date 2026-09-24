import i18n from "@/i18n";
import { Badge } from "@medusajs/ui";
import type { RoleGetResponseDto, RoleListResponseDto } from "@repo/client";
import { getBadgeColor } from "@repo/ui/utils";
import type { IconProps } from "@tabler/icons-react";
import {
  IconUser as BasicUserIcon,
  IconUserCog as SuperAdminIcon,
  IconUsers as WorkspaceMemberIcon,
  IconUserShield as AdminIcon,
  IconUserStar as WorkspaceOwnerIcon,
} from "@tabler/icons-react";

type RoleType = RoleGetResponseDto["type"];

type RoleTypeMeta = { icon: React.ComponentType<IconProps>; label: string };

/** Icon and translated label used to present each role type. */
export const ROLE_TYPES: Record<RoleType, RoleTypeMeta> = {
  ADMIN: { icon: AdminIcon, label: i18n.t("roles.types.admin") },
  SUPER_ADMIN: {
    icon: SuperAdminIcon,
    label: i18n.t("roles.types.superAdmin"),
  },
  USER: { icon: BasicUserIcon, label: i18n.t("roles.types.user") },
  WORKSPACE_MEMBER: {
    icon: WorkspaceMemberIcon,
    label: i18n.t("roles.types.workspaceMember"),
  },
  WORKSPACE_OWNER: {
    icon: WorkspaceOwnerIcon,
    label: i18n.t("roles.types.workspaceOwner"),
  },
};

type RoleTypeCellProps = React.ComponentPropsWithoutRef<typeof Badge> &
  Pick<RoleListResponseDto, "type">;

export const RoleTypeCell = ({ type, ...rest }: RoleTypeCellProps) => {
  const { icon: RoleIcon, label } = ROLE_TYPES[type];

  return (
    <Badge color={getBadgeColor(type)} {...rest}>
      <RoleIcon size={14} className="mr-1" />
      {label}
    </Badge>
  );
};
