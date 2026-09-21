import i18n from "@/i18n";
import { StatusBadge } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { ComponentPropsWithoutRef } from "react";

type AccountStatus = AccountGetDetailResponseDto["status"];
type BadgeColor = ComponentPropsWithoutRef<typeof StatusBadge>["color"];

/** Dot colour and label per status, resolved once at module load. */
const STATUS_META: Record<AccountStatus, { color: BadgeColor; label: string }> =
  {
    ACTIVE: {
      color: "green",
      label: i18n.t("accounts.details.statuses.active.label"),
    },
    BLOCKED: {
      color: "red",
      label: i18n.t("accounts.details.statuses.blocked.label"),
    },
    INACTIVE: {
      color: "grey",
      label: i18n.t("accounts.details.statuses.inactive.label"),
    },
  };

export type AccountStatusCellProps = { status: AccountStatus };

/** Status pill for an account row. */
export const AccountStatusCell = ({ status }: AccountStatusCellProps) => {
  const { color, label } = STATUS_META[status];

  return <StatusBadge color={color}>{label}</StatusBadge>;
};
