import { channelOf } from "@/components/platform-icon/channel-catalog";
import {
  PlatformIcon,
  type AccountType,
} from "@/components/platform-icon/platform-icon";
import type { FC } from "react";

/** A channel's logo and name, for the first column of a breakdown. */
export const ChannelCell: FC<{ platform: AccountType }> = ({ platform }) => (
  <span className="flex items-center gap-x-2">
    <PlatformIcon type={platform} size={16} />
    {channelOf(platform).label}
  </span>
);
