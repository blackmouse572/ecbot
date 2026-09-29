import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { Avatar, clx, Text } from "@medusajs/ui";
import type {
  UserShortResponseDto,
  WorkspaceMemberListResponseDto,
} from "@repo/client";

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

type MembersNameCellProps = {
  member: Pick<WorkspaceMemberListResponseDto, "user" | "role">;
};

/** Identity column; the role column already says who owns the workspace. */
export const MembersNameCell = ({ member }: MembersNameCellProps) => (
  <MemberAvatarName user={member.user} />
);
