import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { PlusMini } from "@medusajs/icons";
import { Avatar, clx, IconButton, Skeleton } from "@medusajs/ui";
import type { UserListResponseDto } from "@repo/client";
import { CommandItem } from "@repo/ui/components";
import type React from "react";

const ITEM_LAYOUT = "px-3 py-2 flex items-center justify-between";

// Fuzzy (co-member) search results never carry an email — only an exact
// email match does (see the /invitable endpoint's two search branches).
type InvitableUser = Pick<UserListResponseDto, "id" | "name" | "photo"> & {
  email?: string;
};

export type InvitableUserItemProps = React.ComponentProps<
  typeof CommandItem
> & {
  user: InvitableUser;
  onInvite: (email: string) => void;
};

/** Trailing button that fires the invite for a row. */
const InviteButton = ({ onClick }: { onClick?: () => void }) => (
  <IconButton
    className="ml-auto"
    size="xsmall"
    variant="transparent"
    onClick={onClick}
  >
    <PlusMini />
  </IconButton>
);

/** A workspace-less user the current workspace may invite. */
export function InvitableUserItem({
  user,
  className: extraClass,
  onInvite,
  ...rest
}: InvitableUserItemProps) {
  if (!user) {
    return null;
  }

  const photoUrl = user.photo?.cdnUrl || user.photo?.completedUrl;
  const fallback = getAvatarFallback(user?.name || user?.email);

  return (
    <CommandItem {...rest} className={clx(ITEM_LAYOUT, extraClass)}>
      <div className="flex gap-2 items-center">
        <Avatar size="xsmall" src={photoUrl} fallback={fallback} />
        <p>{user.name || user.email}</p>
      </div>

      <div className="flex items-center gap-2">
        {user.name && user.email ? (
          <p className="text-ui-fg-muted">{user.email}</p>
        ) : null}
        {/* Fuzzy (co-member) results carry no email, so there's nothing to
            invite with here — the caller has to type the exact address,
            which routes the search into the exact-email match instead. */}
        {user.email ? (
          <InviteButton onClick={() => onInvite(user.email as string)} />
        ) : null}
      </div>
    </CommandItem>
  );
}

export type InvitableEmailItemProps = Omit<InvitableUserItemProps, "user"> & {
  /** Raw e-mail typed in the search box — no account exists for it yet. */
  email: string;
};

/** Lets an unknown e-mail address be invited straight from the search box. */
export function InvitableEmailItem({
  email,
  className: extraClass,
  onInvite,
  ...rest
}: InvitableEmailItemProps) {
  const fallback = getAvatarFallback(email, { letterAmount: 1 });

  return (
    <CommandItem {...rest} className={clx(ITEM_LAYOUT, extraClass)}>
      <div className="flex gap-2 items-center">
        <Avatar className="mr-2" size="xsmall" fallback={fallback} />
        <p>{email}</p>
      </div>
      <InviteButton onClick={() => onInvite(email)} />
    </CommandItem>
  );
}

/** Placeholder row shown while candidates load. */
export function InviteItemSkeleton() {
  return (
    <CommandItem className={ITEM_LAYOUT}>
      <div className="flex gap-2 items-center">
        <Skeleton className="size-6" />
        <Skeleton className="w-24 h-4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-32 h-4" />
        <InviteButton />
      </div>
    </CommandItem>
  );
}
