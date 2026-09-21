import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { defaultNs } from "@/i18n";
import { ROUTES } from "@/routes/constants";
import { EyeMini } from "@medusajs/icons";
import { StatusBadge } from "@medusajs/ui";
import type { ChatbotListResponseDto } from "@repo/client";
import { IconCodeDots } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CHATBOT_TYPE_CONFIG } from "../../../../constants";
import { ChatbotNameCell } from "../chatbot-name-cell";
import { ChatbotStatusCell } from "../chatbot-status-cell";
import { ChatbotTypeBadge } from "../chatbot-type-badge";

const columnHelper = createColumnHelper<ChatbotListResponseDto>();

type ChatbotType = keyof typeof CHATBOT_TYPE_CONFIG;

/** The list endpoint also returns the author; the generated DTO omits it. */
type ChatbotRow = ChatbotListResponseDto & {
  addedBy?: { id: string; name: string; avatar?: string };
};

export const useChatbotTableColumns = () => {
  const { t } = useTranslation(defaultNs);
  const { workspaceSlug } = useWorkspaceParams();

  return useMemo(() => {
    /** Header for the toggle columns: a glyph in front of the label. */
    const iconHeader = (icon: ReactNode, label: string) => (
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    );

    /** Reads an on/off chatbot setting as an enabled / disabled badge. */
    const toggleBadge = (on?: boolean) => (
      <StatusBadge color={on ? "green" : "grey"}>
        {on ? t("actions.enable") : t("actions.disable")}
      </StatusBadge>
    );

    const missing = <div className="text-ui-fg-muted">-</div>;

    return [
      columnHelper.display({
        id: "name",
        header: () => t("fields.name"),
        cell: ({ row }) => {
          const config = CHATBOT_TYPE_CONFIG[row.original.type as ChatbotType];

          return (
            <div className="space-y-1 py-2">
              <ChatbotNameCell
                size="small"
                name={row.original.name}
                avatar={row.original.avatar}
              />
              <ChatbotTypeBadge config={config} size="xsmall" clamp />
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
        id: "autoRead",
        header: () => iconHeader(<EyeMini />, t("chatbot.details.autoRead")),
        cell: ({ row }) => toggleBadge(row.original.autoRead),
      }),
      // NOTE: shares the "autoRead" id with the column above — left as-is so
      // the rendered table is unchanged.
      columnHelper.display({
        id: "autoRead",
        header: () =>
          iconHeader(
            <IconCodeDots className="size-5" />,
            t("chatbot.details.typingIndicator"),
          ),
        cell: ({ row }) => toggleBadge(row.original.typingIndicator),
      }),

      columnHelper.display({
        id: "linkedAccounts",
        header: () => t("chatbot.list.columns.linkedAccounts"),
        cell: ({ row }) => row.original.accounts?.length || 0,
      }),
      columnHelper.display({
        id: "addedBy",
        header: () => t("fields.addedBy"),
        cell: ({ row }) => {
          const { addedBy } = row.original as ChatbotRow;

          if (!addedBy) {
            return missing;
          }

          const memberPath = `${ROUTES.Settings}/${ROUTES.WorkspaceMember}`;

          return (
            <Link to={`/${workspaceSlug}/${memberPath}/${addedBy.id}`}>
              <ChatbotNameCell name={addedBy.name} avatar={addedBy.avatar} />
            </Link>
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
  }, [t, workspaceSlug]);
};
