import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { defaultNs } from "@/i18n";
import { Avatar, Badge, clx, Text } from "@medusajs/ui";
import type {
  UserShortResponseDto,
  WorkspaceMemberListResponseDto,
} from "@repo/client";
import { useTranslation } from "react-i18next";

export type MemberAvatarNameProps = React.HTMLAttributes<HTMLDivElement> & {
  user: Pick<UserShortResponseDto, "name">;
  src?: string;
  size?: React.ComponentProps<typeof Avatar>["size"];
};

/** Avatar paired with a display name, truncated to the available width. */
export const MemberAvatarName = ({
  user,
  src,
  size: avatarSize = "small",
  className: extraClass,
  ...rest
}: MemberAvatarNameProps) => (
  <div {...rest} className={clx("flex items-center gap-2", extraClass)}>
    <Avatar
      size={avatarSize}
      src={src}
      fallback={getAvatarFallback(user.name)}
    />
    <Text size="xsmall" className="truncate">
      {user.name}
    </Text>
  </div>
);

const OwnerBadge = () => {
  const { t } = useTranslation(defaultNs);
  const label = t("roles.types.workspaceOwner");

  return (
    <Badge size="2xsmall" color="purple">
      {label}
    </Badge>
  );
};

type MembersNameCellProps = {
  member: Pick<WorkspaceMemberListResponseDto, "user" | "role">;
};

/** Identity column: the member, flagged when they own the workspace. */
export const MembersNameCell = ({ member }: MembersNameCellProps) => (
  <div className="flex items-center gap-2">
    <MemberAvatarName user={member.user} />
    {member.role?.type === "WORKSPACE_OWNER" && <OwnerBadge />}
  </div>
);
