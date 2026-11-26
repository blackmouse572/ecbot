import {
  useMarketingSendReplies,
  type MarketingSendReplyResponseDto,
} from "@/hooks/api/marketing-sends";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Container, Heading, StatusBadge, Table, Text } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  MARKETING_SEND_REPLIES_PAGE_SIZE,
  MARKETING_SEND_REPLY_STATUS_COLOR,
} from "../../constants";

type SendRepliesSectionProps = { sendId: string };

/** Khách đã trả lời: each reply opens its conversation. */
export const SendRepliesSection: FC<SendRepliesSectionProps> = ({ sendId }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [pageIndex, setPageIndex] = useState(0);

  const { replies, count, isLoading, isError, error } = useMarketingSendReplies(
    workspaceSlug,
    sendId,
    {
      page: pageIndex + 1,
      perPage: MARKETING_SEND_REPLIES_PAGE_SIZE,
    },
  );

  if (isError) {
    throw error;
  }

  const pageCount = Math.ceil(count / MARKETING_SEND_REPLIES_PAGE_SIZE);

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("marketing.sends.replies.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("marketing.sends.replies.description")}
        </Text>
      </div>
      {!isLoading && !replies.length ? (
        <Text size="small" className="text-ui-fg-subtle px-6 py-4">
          {t("marketing.sends.replies.empty")}
        </Text>
      ) : (
        <ul className="divide-y">
          {replies.map((reply) => (
            <li key={reply.customerId}>
              <ReplyRow reply={reply} workspaceSlug={workspaceSlug} />
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <Table.Pagination
          className="max-sm:flex-col max-sm:items-start max-sm:gap-y-1 [&_p]:whitespace-nowrap"
          count={count}
          pageSize={MARKETING_SEND_REPLIES_PAGE_SIZE}
          pageIndex={pageIndex}
          pageCount={pageCount}
          canPreviousPage={pageIndex > 0}
          canNextPage={pageIndex + 1 < pageCount}
          previousPage={() => setPageIndex((page) => page - 1)}
          nextPage={() => setPageIndex((page) => page + 1)}
          translations={{
            of: t("general.of"),
            results: t("general.results"),
            pages: t("general.pages"),
            prev: t("general.prev"),
            next: t("general.next"),
          }}
        />
      )}
    </Container>
  );
};

const ReplyRow: FC<{
  reply: MarketingSendReplyResponseDto;
  workspaceSlug: string;
}> = ({ reply, workspaceSlug }) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();

  const body = (
    <div className="flex items-start gap-x-3 px-6 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
        <Text size="small" weight="plus" className="truncate">
          {reply.name ?? t("marketing.sends.replies.unnamed")}
        </Text>
        {reply.text && (
          <Text size="small" className="text-ui-fg-subtle line-clamp-2">
            {reply.text}
          </Text>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-y-1">
        <StatusBadge
          color={MARKETING_SEND_REPLY_STATUS_COLOR[reply.status]}
          className="whitespace-nowrap"
        >
          {t(`marketing.sends.replies.status.${reply.status}`)}
        </StatusBadge>
        <Text size="xsmall" className="text-ui-fg-muted whitespace-nowrap">
          {getFullDate({ date: new Date(reply.repliedAt), includeTime: true })}
        </Text>
      </div>
    </div>
  );

  return reply.conversationId ? (
    <Link
      to={`/${workspaceSlug}/${ROUTES.Conversations}/${reply.conversationId}`}
      className="hover:bg-ui-bg-base-hover focus-visible:shadow-borders-focus block outline-none transition-colors"
    >
      {body}
    </Link>
  ) : (
    body
  );
};
