import { useMarketingDay } from "@/components/customer-marketing";
import type { CustomerMarketingStateGetResponseDto } from "@/hooks/api/customer-marketing";
import { Badge, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  reactions: CustomerMarketingStateGetResponseDto["reactions"];
};

const KEY = "conversations.customer.panel.marketing.productGroups";

/** "Tạm hoãn Serum đến 15/4" per product group, with the reason it was paused. */
export const MarketingProductReactions: FC<Props> = ({ reactions }) => {
  const { t } = useTranslation();
  const formatDay = useMarketingDay();

  return (
    <div className="flex flex-col gap-y-2">
      {reactions.map((reaction) => (
        <div key={reaction.productGroupId} className="flex flex-col gap-y-1">
          <Badge
            size="2xsmall"
            color="orange"
            // The panel is narrow: a long group name wraps instead of spilling.
            className="h-auto min-h-5 self-start py-0.5"
          >
            {t(`${KEY}.paused`, {
              group: reaction.productGroupName,
              date: formatDay(reaction.until),
            })}
          </Badge>
          {reaction.reason && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              {reaction.reason}
            </Text>
          )}
        </div>
      ))}
      <Text size="xsmall" className="text-ui-fg-muted">
        {t(`${KEY}.othersStillSend`)}
      </Text>
    </div>
  );
};
