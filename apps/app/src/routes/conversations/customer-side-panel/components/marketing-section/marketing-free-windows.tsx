import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import type { CustomerMarketingStateGetResponseDto } from "@/hooks/api/customer-marketing";
import { formatRelativeTime } from "@/utils/formatters";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  windows: CustomerMarketingStateGetResponseDto["freeWindows"];
  now?: number;
};

const KEY = "conversations.customer.panel.marketing.freeWindow";
const HOUR = 3_600_000;
const MINUTE = 60_000;

/** How long the shop may still message the customer for free, per channel. */
export const MarketingFreeWindows: FC<Props> = ({
  windows,
  now = Date.now(),
}) => {
  const { t, i18n } = useTranslation();

  const status = (window: Props["windows"][number]) => {
    const channel = channelOf(window.channel).label;

    if (!window.openUntil) return t(`${KEY}.unlimited`, { channel });
    const left = new Date(window.openUntil).getTime() - now;

    if (left <= 0) return t(`${KEY}.closed`, { channel });

    const time =
      left >= HOUR
        ? t(`${KEY}.hours`, { count: Math.floor(left / HOUR) })
        : t(`${KEY}.minutes`, {
            count: Math.max(1, Math.floor(left / MINUTE)),
          });

    return t(`${KEY}.open`, { channel, time });
  };

  return (
    <ul className="flex flex-col gap-y-2">
      {windows.map((window) => (
        <li key={window.channel} className="flex flex-col gap-y-0.5">
          <div className="flex items-center gap-x-2">
            <PlatformIcon type={window.channel} size={16} />
            <Text size="small">{status(window)}</Text>
          </div>
          <Text size="xsmall" className="text-ui-fg-muted">
            {t(`${KEY}.lastInbound`, {
              time: formatRelativeTime(
                window.lastInboundAt,
                i18n.language,
                now,
              ),
            })}
          </Text>
        </li>
      ))}
    </ul>
  );
};
