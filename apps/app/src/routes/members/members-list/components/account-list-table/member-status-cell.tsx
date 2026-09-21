import i18n from "@/i18n";
import { StatusBadge } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";

type MemberStatus = AccountGetDetailResponseDto["status"];
type BadgeColor = React.ComponentPropsWithoutRef<typeof StatusBadge>["color"];

/** Badge colour and label for every account status a member can be in. */
const STATUS_BADGES: Record<MemberStatus, { color: BadgeColor; text: string }> =
  {
    ACTIVE: {
      color: "green",
      text: i18n.t("accounts.details.statuses.active.label"),
    },
    BLOCKED: {
      color: "red",
      text: i18n.t("accounts.details.statuses.blocked.label"),
    },
    INACTIVE: {
      color: "grey",
      text: i18n.t("accounts.details.statuses.inactive.label"),
    },
  };

export const MembersStatusCell = ({ status }: { status: MemberStatus }) => {
  const { color, text } = STATUS_BADGES[status];

  return <StatusBadge color={color}>{text}</StatusBadge>;
};
