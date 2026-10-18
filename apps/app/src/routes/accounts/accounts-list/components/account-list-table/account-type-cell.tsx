import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { Text } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountTypeCellProps = Pick<AccountGetDetailResponseDto, "type">;

/** The account's channel by name and logo, e.g. "Website" for WEBSITE_WIDGET. */
export const AccountTypeCell = ({ type }: AccountTypeCellProps) => (
  <div className="flex items-center gap-1.5">
    <PlatformIcon type={type} aria-hidden />
    <Text size="xsmall" className="truncate">
      {channelOf(type).label}
    </Text>
  </div>
);
