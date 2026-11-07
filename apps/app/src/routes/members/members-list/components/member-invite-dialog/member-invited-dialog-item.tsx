import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { Trash } from "@medusajs/icons";
import { Avatar, clx, IconButton } from "@medusajs/ui";
import type { InvitationListResponseDto } from "@repo/client";
import { CommandItem } from "@repo/ui/components";
import { IconLink } from "@tabler/icons-react";
import { InvitationRoleSelect } from "../../../components/invitation-role-select";

export type Invitation = Pick<
  InvitationListResponseDto,
  "id" | "inviteeEmail" | "role"
>;

type InvitedMemberItemProps = React.ComponentProps<typeof CommandItem> & {
  invitation: Invitation;
  onCopy?: (invitation: Invitation) => void;
  onUpdateRole?: (invitation: Invitation, role: string) => void;
  onRevoke?: (invitation: Invitation) => void;
};

/** A pending invitation: copy its link, change its role or revoke it. */
export function InvitedMemberItem({
  invitation,
  className,
  onCopy,
  onUpdateRole,
  onRevoke,
  ...rest
}: InvitedMemberItemProps) {
  if (!invitation) {
    return null;
  }

  const fallback = getAvatarFallback(invitation.inviteeEmail);

  return (
    <CommandItem
      {...rest}
      className={clx("px-3 py-2 flex items-center justify-between", className)}
    >
      <div className="flex gap-2 items-center">
        <Avatar size="xsmall" fallback={fallback} />
        <p>{invitation.inviteeEmail}</p>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          className="shrink-0"
          variant="transparent"
          onClick={() => onCopy?.(invitation)}
        >
          <IconLink size={16} className="shrink-0" />
        </IconButton>
        <IconButton
          className="shrink-0"
          variant="transparent"
          onClick={() => onRevoke?.(invitation)}
        >
          <Trash className="shrink-0" />
        </IconButton>
        <InvitationRoleSelect
          className="w-[170px]"
          value={invitation.role}
          onValueChange={(role) => onUpdateRole?.(invitation, role)}
        />
      </div>
    </CommandItem>
  );
}
