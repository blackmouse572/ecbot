import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import type {
  AccountGetDetailResponseDto,
  ChatbotListResponseDto,
} from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CHATBOT_TYPE_CONFIG } from "../../../../constants";
import { ChatbotChannelsCell } from "../chatbot-channels-cell";
import { ChatbotNameCell } from "../chatbot-name-cell";
import { ChatbotStatusCell } from "../chatbot-status-cell";
import { ChatbotTypeBadge } from "../chatbot-type-badge";

const columnHelper = createColumnHelper<ChatbotListResponseDto>();

type ChatbotType = keyof typeof CHATBOT_TYPE_CONFIG;

type ChatbotAccounts = Pick<
  AccountGetDetailResponseDto,
  "id" | "type" | "name"
>[];

/**
 * Agent list columns. `conversations` maps an agent id to its conversations
 * in the last 7 days; until it loads the column shows a dash.
 */
export const useChatbotTableColumns = (conversations?: Map<string, number>) => {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const missing = <span className="text-ui-fg-muted">-</span>;

    return [
      columnHelper.display({
        id: "name",
        header: () => t("fields.name"),
        cell: ({ row }) => {
          const config = CHATBOT_TYPE_CONFIG[row.original.type as ChatbotType];

          return (
            <div className="max-w-80 space-y-1 py-2">
              <ChatbotNameCell
                size="small"
                name={row.original.name}
                avatar={row.original.avatar}
              />
              {config && (
                <ChatbotTypeBadge config={config} size="xsmall" clamp />
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: () => t("fields.status"),
        cell: ({ row }) => <ChatbotStatusCell item={row.original} />,
      }),
      columnHelper.display({
        id: "channels",
        header: () => t("chatbot.list.columns.channels"),
        // SAFETY: the list endpoint populates `accounts` with account objects
        // (ChatbotListResponseDto @Type), the generated client types them as ids.
        cell: ({ row }) => (
          <ChatbotChannelsCell
            accounts={
              (row.original.accounts ?? []) as unknown as ChatbotAccounts
            }
          />
        ),
      }),
      columnHelper.display({
        id: "conversations",
        header: () => t("chatbot.list.columns.conversations7d"),
        cell: ({ row }) => {
          const count = conversations?.get(row.original.id) ?? 0;

          return count ? (
            <span className="tabular-nums">
              {count.toLocaleString(i18n.language)}
            </span>
          ) : (
            missing
          );
        },
      }),
      columnHelper.display({
        id: "updatedAt",
        header: () => t("fields.updatedAt"),
        cell: ({ row }) =>
          row.original.updatedAt ? (
            <CreatedAtCell date={row.original.updatedAt} />
          ) : (
            missing
          ),
      }),
    ];
  }, [t, i18n.language, conversations]);
};
