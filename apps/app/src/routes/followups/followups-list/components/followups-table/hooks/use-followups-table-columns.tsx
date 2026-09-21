import { useDate } from "@/hooks/use-date";
import type { FollowupListResponseDto } from "@/hooks/api/followups";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { Text } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FollowupStatusBadge } from "../followup-status-badge";

const columnHelper = createColumnHelper<FollowupListResponseDto>();

export const useFollowupsTableColumns = () => {
  const { t } = useTranslation();
  const { getRelativeDateOrFullDate } = useDate();

  return useMemo(
    () => [
      columnHelper.display({
        id: "chatbot",
        header: () => t("followups.list.columns.chatbot"),
        cell: ({ row }) => (
          <ChatbotNameCell
            size="small"
            name={row.original.chatbot.name}
            avatar={row.original.chatbot.avatar ?? undefined}
          />
        ),
      }),
      columnHelper.display({
        id: "customer",
        header: () => t("followups.list.columns.customer"),
        cell: ({ row }) =>
          row.original.senderName ? (
            <Text size="small">{row.original.senderName}</Text>
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              -
            </Text>
          ),
      }),
      columnHelper.display({
        id: "reason",
        header: () => t("followups.list.columns.reason"),
        cell: ({ row }) => (
          <Text size="small" className="line-clamp-2">
            {row.original.reason}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: () => t("followups.list.columns.status"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-y-0.5">
            <FollowupStatusBadge status={row.original.status} />
            {row.original.outcomeReason && (
              <Text size="xsmall" className="text-ui-fg-muted line-clamp-1">
                {t(
                  `followups.list.skipReason.${row.original.outcomeReason}`,
                  row.original.outcomeReason,
                )}
              </Text>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: "firesIn",
        header: () => t("followups.list.columns.firesIn"),
        // Pending followups count down; everything else reports when it ran.
        cell: ({ row }) => {
          if (row.original.status === "SCHEDULED") {
            return t("followups.list.firesInMinutes", {
              count: row.original.firesInMinutes,
            });
          }

          return row.original.firedAt ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("followups.list.firedAgo", {
                time: getRelativeDateOrFullDate(new Date(row.original.firedAt)),
              })}
            </Text>
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              -
            </Text>
          );
        },
      }),
    ],
    [t, getRelativeDateOrFullDate],
  );
};
