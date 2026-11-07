import { Badge } from "@medusajs/ui";
import type { InvitationListResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { INVITATION_STATUS_COLOR } from "../constants";

type InvitationStatusBadgeProps = {
  status: InvitationListResponseDto["status"];
};

/** Readable status (Pending, Accepted, ...) instead of the raw enum. */
export const InvitationStatusBadge: FC<InvitationStatusBadgeProps> = ({
  status,
}) => {
  const { t } = useTranslation();

  return (
    <Badge size="2xsmall" color={INVITATION_STATUS_COLOR[status]}>
      {t(`members.invitations.status.${status}`)}
    </Badge>
  );
};
