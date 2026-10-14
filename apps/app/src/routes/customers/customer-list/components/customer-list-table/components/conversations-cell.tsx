import {
  PlatformIcon,
  type AccountType,
} from "@/components/platform-icon/platform-icon";
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

  return (
    <div className="flex items-center gap-x-2">
      <div className="flex items-center -space-x-1.5">
        {logos.map((type) => (
          <PlatformIcon
            key={type}
            type={type as AccountType}
            size={20}
            className="ring-ui-bg-base ring-2"
          />
        ))}
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        {t("customers.list.conversationCount", { count: conversationCount })}
      </Text>
    </div>
  );
};
