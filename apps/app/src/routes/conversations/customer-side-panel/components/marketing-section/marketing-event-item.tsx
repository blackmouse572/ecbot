import {
  useMarketingDate,
  useMarketingEventText,
} from "@/components/customer-marketing";
import type { MarketingEventGetResponseDto } from "@/hooks/api/customer-marketing";
import { Badge, clx, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  event: MarketingEventGetResponseDto;
  // Only set for messages of the conversation on screen.
  onViewMessage?: (messageId: string) => void;
};

const DOT_CLASS: Record<MarketingEventGetResponseDto["kind"], string> = {
  STAGE: "shadow-[0_0_0_1.5px_var(--tag-orange-icon)]",
  PERMISSION: "shadow-[0_0_0_1.5px_var(--tag-green-icon)]",
  CONSENT_ASKED: "shadow-[0_0_0_1.5px_var(--tag-blue-icon)]",
  HOSTILE: "shadow-[0_0_0_1.5px_var(--tag-red-icon)]",
  REACTION: "shadow-[0_0_0_1.5px_var(--tag-purple-icon)]",
  INTENT: "shadow-[0_0_0_1.5px_var(--tag-orange-icon)]",
  SOURCE: "shadow-[0_0_0_1.5px_var(--tag-neutral-icon)]",
};

/** One label change: what changed, why, when and who. */
export const MarketingEventItem: FC<Props> = ({ event, onViewMessage }) => {
  const { t } = useTranslation();
  const formatDate = useMarketingDate();
  const toText = useMarketingEventText();
  const { title, reason, actor } = toText(event);
  const messageId = event.messageId;

  return (
    <li className="relative flex flex-col gap-y-0.5 pb-3 last:pb-0">
      <span
        aria-hidden
        className={clx(
          "bg-ui-bg-base absolute -left-[15px] top-1.5 size-[7px] rounded-full",
          DOT_CLASS[event.kind],
        )}
      />
      <Text size="small" weight="plus">
        {title}
      </Text>
      {reason && (
        <Text size="small" className="text-ui-fg-subtle">
          {reason}
        </Text>
      )}
      <div className="flex flex-wrap items-center gap-x-1.5">
        <Text size="xsmall" className="text-ui-fg-muted">
          {formatDate(event.createdAt)}
        </Text>
        <Badge size="2xsmall">{actor}</Badge>
        {messageId && onViewMessage && (
          <button
            type="button"
            className="txt-compact-xsmall-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            onClick={() => onViewMessage(messageId)}
          >
            {t("customerMarketing.viewMessage")}
          </button>
        )}
      </div>
    </li>
  );
};
