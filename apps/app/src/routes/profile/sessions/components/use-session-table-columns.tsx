import { PlaceholderCell } from "@/components/table/table-cells/common/placeholder-cell";
import {
  TextCell,
  TextHeader,
} from "@/components/table/table-cells/common/text-cell";
import { useDate } from "@/hooks/use-date";
import type { SessionStatus } from "@/modules/sessions";
import { Badge } from "@medusajs/ui";
import type { SessionListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const STATUS_COLOR: Record<SessionStatus, "green" | "grey"> = {
  ACTIVE: "green",
  REVOKED: "grey",
};

const columnHelper = createColumnHelper<SessionListResponseDto>();

export const useSessionTableColumns = () => {
  const { t } = useTranslation();
  const { getFullDate, getRelativeDateOrFullDate } = useDate();

  return useMemo(
    () => [
      columnHelper.display({
        id: "userAgent",
        header: () => <TextHeader text={t("sessions.table.device")} />,
        cell: ({ row }) => <TextCell text={row.original.userAgent} />,
      }),
      columnHelper.display({
        id: "ip",
        header: () => <TextHeader text={t("sessions.table.ip")} />,
        cell: ({ row }) => <TextCell text={row.original.ip} maxWidth={140} />,
      }),
      columnHelper.display({
        id: "country",
        header: () => <TextHeader text={t("sessions.table.location")} />,
        cell: ({ row }) => (
          <TextCell text={row.original.country} maxWidth={120} />
        ),
      }),
      columnHelper.display({
        id: "createdAt",
        header: () => <TextHeader text={t("sessions.table.signedInAt")} />,
        cell: ({ row }) => (
          <TextCell
            text={getFullDate({
              date: new Date(row.original.createdAt),
              includeTime: true,
            })}
          />
        ),
      }),
      columnHelper.display({
        id: "lastActiveAt",
        header: () => <TextHeader text={t("sessions.table.lastActiveAt")} />,
        cell: ({ row }) => {
          const lastActiveAt = row.original.lastActiveAt;
          if (!lastActiveAt) {
            return <PlaceholderCell />;
          }
          return (
            <TextCell
              text={getRelativeDateOrFullDate(new Date(lastActiveAt))}
            />
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: () => <TextHeader text={t("fields.status")} />,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge size="2xsmall" color={STATUS_COLOR[status] ?? "grey"}>
              {t(`sessions.status.${status}`)}
            </Badge>
          );
        },
      }),
    ],
    [getFullDate, getRelativeDateOrFullDate, t],
  );
};
