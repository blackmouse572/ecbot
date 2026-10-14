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

const MAX_LOGOS = 4;

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

  const shown = logos.slice(0, MAX_LOGOS);
  const hidden = logos.length - shown.length;

  return (
    <div className="flex items-center gap-x-2">
      <div className="flex shrink-0 items-center -space-x-1.5">
        {shown.map((type) => (
          <PlatformIcon
            key={type}
            type={type as AccountType}
            size={20}
            className="ring-ui-bg-base shrink-0 ring-2"
          />
        ))}
        {hidden > 0 && (
          <span className="bg-ui-bg-subtle text-ui-fg-subtle ring-ui-bg-base flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none ring-2">
            +{hidden}
          </span>
        )}
      </div>
      <Text size="small" className="text-ui-fg-subtle truncate">
        {t("customers.list.conversationCount", { count: conversationCount })}
      </Text>
    </div>
  );
};
