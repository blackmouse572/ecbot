import type { AccountType } from "@/components/platform-icon/platform-icon";
import { PlatformIconStack } from "@/components/platform-icon/platform-icon-stack";
import { PlaceholderCell } from "@/components/table/table-cells/common/placeholder-cell";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

// A personal account and a page of one platform share a logo.
const platformOf = (type: string) => type.replace(/_(ACCOUNT|PAGE)$/, "");

interface Props {
  conversationCount: number;
  channels: string[];
}

export const ConversationsCell: FC<Props> = ({
  conversationCount,
  channels,
}) => {
  const { t } = useTranslation();

  if (conversationCount === 0) return <PlaceholderCell />;

  const logos = channels.filter(
    (type, i) =>
      channels.findIndex((other) => platformOf(other) === platformOf(type)) ===
      i,
  );

  // SAFETY: `channels` holds the account types of the customer's
  // conversations, typed as strings by the customer DTO.
  return (
    <div className="flex items-center gap-x-2">
      <PlatformIconStack types={logos as AccountType[]} />
      <Text size="small" className="text-ui-fg-subtle truncate">
        {t("customers.list.conversationCount", { count: conversationCount })}
      </Text>
    </div>
  );
};
