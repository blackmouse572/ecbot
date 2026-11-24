import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { useConversation } from "@/hooks/api/conversations";
import { Avatar, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { senderLabel } from "../../../sender-label";
import { DetailRow } from "../detail-row";

const KEY = "conversations.customer.panel";

/**
 * The panel for a chat with no customer yet (a website or API visitor who
 * has not left a phone, email or order): the same sections, each saying what
 * fills it, and the channel they wrote on, read from the conversation.
 */
export const NoCustomerSection: FC<{ conversationId?: string }> = ({
  conversationId,
}) => {
  const { t } = useTranslation();
  const { conversation } = useConversation(conversationId);
  const account = conversation?.account as
    { type?: string; name?: string } | undefined;
  const name = conversation ? senderLabel(conversation as A, t) : null;
  const channel = [
    account?.type && channelOf(account.type as A).label,
    account?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="px-4 py-4">
        <div className="shadow-borders-base bg-ui-bg-base flex gap-x-3 rounded-md p-3">
          <Avatar
            size="small"
            fallback={(name ?? "?").slice(0, 1).toUpperCase()}
          />
          <div className="flex flex-col gap-y-0.5">
            <Text size="small" weight="plus">
              {t(`${KEY}.noCustomer.title`)}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t(`${KEY}.noCustomer.hint`)}
            </Text>
          </div>
        </div>
      </div>

      <div className="border-ui-border-base flex flex-col gap-y-2.5 border-t px-4 py-4">
        <Heading level="h3">{t(`${KEY}.details`)}</Heading>
        <DetailRow label={t(`${KEY}.fields.name`)} value={null} />
        <DetailRow label={t(`${KEY}.fields.phone`)} value={null} />
        <DetailRow label={t(`${KEY}.fields.email`)} value={null} />
      </div>

      <div className="border-ui-border-base border-t px-4 py-4">
        <Heading level="h3" className="mb-2">
          {t(`${KEY}.tags.title`)}
        </Heading>
        <Text size="small" className="text-ui-fg-muted">
          {t(`${KEY}.noCustomer.tags`)}
        </Text>
      </div>

      <div className="border-ui-border-base border-t px-4 py-4">
        <Heading level="h3" className="mb-2">
          {t(`${KEY}.contactPoints.title`)}
        </Heading>
        {conversation && (
          <div className="shadow-borders-base bg-ui-bg-base flex items-center gap-x-2.5 rounded-md px-3 py-2.5">
            <div className="relative">
              <Avatar
                size="small"
                fallback={(name ?? "?").slice(0, 1).toUpperCase()}
              />
              <PlatformIcon
                type={account?.type as A}
                size={14}
                className="ring-ui-bg-base absolute -bottom-0.5 -right-0.5 rounded-full ring-2"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <Text size="small" weight="plus" className="truncate">
                {name}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle truncate">
                {channel}
              </Text>
            </div>
          </div>
        )}
      </div>

      <div className="border-ui-border-base border-t px-4 py-4">
        <Heading level="h3" className="mb-2">
          {t(`${KEY}.marketing.title`)}
        </Heading>
        <Text size="small" className="text-ui-fg-muted">
          {t(`${KEY}.noCustomer.marketing`)}
        </Text>
      </div>
    </>
  );
};
