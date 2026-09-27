import { PLATFORM_ICON_SRC } from "@/components/platform-icon/platform-icon";
import type { ChannelId } from "@repo/agent-blueprint";

/** Channel choice -> platform logo, reusing platform-icon's shared paths (wireframe delta section 3). */
const CHANNEL_ICON_SRC: Partial<Record<ChannelId, string>> = {
  messenger: PLATFORM_ICON_SRC.facebookMessenger,
  instagram: PLATFORM_ICON_SRC.instagram,
  zalo: PLATFORM_ICON_SRC.zalo,
  tiktok: PLATFORM_ICON_SRC.tiktok,
  shopee: PLATFORM_ICON_SRC.shopee,
  website: PLATFORM_ICON_SRC.websiteWidget,
  telegram: PLATFORM_ICON_SRC.telegram,
};

export function channelIcon(value: string) {
  const src = CHANNEL_ICON_SRC[value as ChannelId];
  // Decorative logo: alt="" is intentional, the choice label text sits next to it.
  return src ? <img src={src} alt="" aria-hidden width={16} height={16} /> : undefined;
}
