import { useInvitableUsers, useInviteUser } from "@/hooks/api";
import { readApiError } from "@/libs/api-error";
import { toast } from "@medusajs/ui";
import { CommandGroup } from "@repo/ui/components";
import { useTranslation } from "react-i18next";
import {
  InvitableEmailItem,
  InvitableUserItem,
  InviteItemSkeleton,
} from "./member-invite-dialog-item";

const CANDIDATES_PER_PAGE = 5;

/** A typed value only counts as an address once it has an @ and a dot. */
const looksLikeEmail = (value?: string) =>
  Boolean(value?.includes("@") && value?.includes("."));

type MemberInvitableListProps = {
  enabled?: boolean;
  search?: string;
  /** Role every invite from this list carries. */
  roleId?: string;
};

export function MemberInvitableList({
  enabled,
  search,
  roleId,
}: MemberInvitableListProps) {
  const { t } = useTranslation();
  const { users, isLoading, isFetching } = useInvitableUsers(
    {
      orderBy: "createdAt",
      orderDirection: "desc",
      page: 1,
      perPage: CANDIDATES_PER_PAGE,
      search,
    },
    {
      enabled,
    },
  );
  const inviteUser = useInviteUser();

  // The error toast carries the API's reason, so the owner knows why the
  // invite did not go out.
  const invite = async (invitedEmail: string) => {
    const id = toast.loading(t("members.inviteMember.loading"));
    try {
      await inviteUser.mutateAsync({ invitedEmail, roleId });
      toast.success(
        t("members.inviteMember.success", { email: invitedEmail }),
        { id },
      );
    } catch (error) {
      toast.error(
        readApiError(error).message ??
          t("errorBoundary.internalServerErrorMessage"),
        { id },
      );
    }
  };

  const isBusy = isLoading || isFetching;
  const isEmail = looksLikeEmail(search);
  const offerTypedEmail = users?.length === 0 && isEmail;
  // Until a full address is typed there is nothing to invite, so say what to
  // type instead of "no results".
  const showEmailHint = !isBusy && !users?.length && !isEmail;

  return (
    <CommandGroup
      heading={
        showEmailHint ? undefined : t("members.inviteMember.searchResults")
      }
    >
      {showEmailHint && (
        <p className="px-3 py-2 text-sm text-ui-fg-muted">
          {t("members.inviteMember.emailHint")}
        </p>
      )}

      {isBusy &&
        Array.from({ length: CANDIDATES_PER_PAGE }).map((_, index) => (
          <InviteItemSkeleton key={index} />
        ))}

      {!isBusy &&
        users?.map((user) => (
          <InvitableUserItem key={user.id} user={user} onInvite={invite} />
        ))}

      {!isBusy && offerTypedEmail && (
        <InvitableEmailItem email={search ?? ""} onInvite={invite} />
      )}
    </CommandGroup>
  );
}
