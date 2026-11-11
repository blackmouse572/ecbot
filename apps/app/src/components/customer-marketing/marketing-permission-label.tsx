import { CheckCircleSolid, CircleDottedLine, Clock } from "@medusajs/icons";
import { Badge, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useDate } from "@/hooks/use-date";
import type { CustomerPermission } from "./types";

type Props = {
  permission: CustomerPermission;
  permissionUntil?: string | null;
  hostile?: boolean;
};

const ICONS = {
  PENDING: <CircleDottedLine className="text-ui-fg-muted" />,
  GRANTED: <CheckCircleSolid className="text-ui-tag-green-icon" />,
  PAUSED: <Clock className="text-ui-tag-orange-icon" />,
};

/**
 * Whether offers may be sent. Quiet icon and text, except the two states a
 * shop must not miss: stopped for good and Khó chịu.
 */
export const MarketingPermissionLabel: FC<Props> = ({
  permission,
  permissionUntil,
  hostile,
}) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();

  if (permission === "STOPPED" || hostile) {
    return (
      <span className="flex flex-wrap items-center gap-1">
        {permission === "STOPPED" && (
          <Badge size="2xsmall" color="red">
            {t("customerMarketing.permission.STOPPED")}
          </Badge>
        )}
        {hostile && (
          <Badge size="2xsmall" color="red">
            {t("customerMarketing.hostile")}
          </Badge>
        )}
      </span>
    );
  }

  const label =
    permission === "PAUSED" && permissionUntil
      ? t("customerMarketing.pausedUntil", {
          date: getFullDate(new Date(permissionUntil)),
        })
      : t(`customerMarketing.permission.${permission}`);

  return (
    <span
      className={clx(
        "txt-compact-small inline-flex items-center gap-x-1.5 whitespace-nowrap",
        permission === "PENDING" ? "text-ui-fg-muted" : "text-ui-fg-subtle",
      )}
    >
      {ICONS[permission]}
      {label}
    </span>
  );
};
