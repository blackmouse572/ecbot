import { useChatbot } from "@/hooks/api";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ChatbotStatusCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-status-cell";
import { ChatbotTypeCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-cell";
import { ROUTES } from "@/routes/constants";
import { ArrowUpRightOnBox } from "@medusajs/icons";
import {
  Container,
  Divider,
  Heading,
  IconButton,
  Skeleton,
} from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

type ChatbotSectionProps = {
  chatbotId: string;
  title?: string;
};

type SummaryRow = { title: string; value: ReactNode };

/**
 * The rows of the card. Until the chatbot arrives every value is a skeleton,
 * so the card keeps its height instead of growing once the request settles.
 */
const useSummaryRows = (
  chatbot?: ChatbotGetDetailResponseDto,
): SummaryRow[] => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const pending = <Skeleton className="h-8 w-full" />;

  return [
    { title: t("chatbot.edit.name"), value: chatbot?.name },
    {
      title: t("fields.status"),
      value: chatbot && <ChatbotStatusCell item={chatbot} />,
    },
    {
      title: t("fields.type"),
      value: chatbot && <ChatbotTypeCell item={chatbot} />,
    },
    {
      title: t("fields.createdAt"),
      value: chatbot && getFullDate(new Date(chatbot.createdAt)),
    },
    {
      title: t("fields.updatedAt"),
      value: chatbot && getFullDate(new Date(chatbot.updatedAt)),
    },
  ].map((row) => ({ ...row, value: row.value ?? pending }));
};

/** Read-only card summarising one chatbot, with a jump to its detail page. */
export const ChatbotSection = ({ chatbotId, title }: ChatbotSectionProps) => {
  const { t } = useTranslation();
  const workspace = useWorkspaceParams();
  const { pathname } = useLocation();
  const { chatbot, isLoading } = useChatbot(chatbotId);

  const loaded: ChatbotGetDetailResponseDto | undefined = isLoading
    ? undefined
    : chatbot;
  const rows = useSummaryRows(loaded);
  const heading = title || t("chatbot.title");

  return (
    <Container className="p-0">
      <div
        className={
          loaded
            ? "flex items-center justify-between gap-y-1 p-6 py-4"
            : "flex flex-col gap-y-1 p-6 py-4"
        }
      >
        <Heading>{heading}</Heading>
        {loaded && (
          <Link
            to={`/${workspace.workspaceSlug}/${ROUTES.Chatbot}/${loaded.id}`}
            state={{ prev: pathname }}
          >
            <IconButton variant="transparent" size="small">
              <ArrowUpRightOnBox />
            </IconButton>
          </Link>
        )}
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        {rows.map((row) => (
          <SectionRow key={row.title} title={row.title} value={row.value} />
        ))}
      </Section>
    </Container>
  );
};
