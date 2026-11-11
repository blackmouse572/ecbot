import type { OrderGetResponseDto } from "@/hooks/api/orders";
import { ChatBubble, DocumentText } from "@medusajs/icons";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const ICONS = {
  CHAT: <ChatBubble className="text-ui-fg-interactive" />,
  IMPORT: <DocumentText className="text-ui-tag-green-icon" />,
  MANUAL: null,
};

/** Chat, Thêm tay or Nhập file, with the icon the list shows (frame 14). */
export const OrderSourceLabel: FC<{
  source: OrderGetResponseDto["source"];
}> = ({ source }) => {
  const { t } = useTranslation();

  return (
    <span className="txt-compact-small text-ui-fg-subtle flex items-center gap-x-1.5 whitespace-nowrap">
      {ICONS[source]}
      {t(`orders.source.${source}`)}
    </span>
  );
};
