import {
  BellAlert,
  Bolt,
  ChatBubbleLeftRight,
  CheckCircle,
  Clock,
  Envelope,
  ExclamationCircle,
  InformationCircle,
  Users,
  XCircle,
} from "@medusajs/icons";
import type { ComponentType } from "react";

export const NOTIFICATION_PAGE_SIZE = 20;

type NotificationIcon = {
  Icon: ComponentType<{ className?: string }>;
  // Tag tokens: tinted background + matching icon color.
  className: string;
};

const BLUE = "bg-ui-tag-blue-bg text-ui-tag-blue-icon";
const GREEN = "bg-ui-tag-green-bg text-ui-tag-green-icon";
const ORANGE = "bg-ui-tag-orange-bg text-ui-tag-orange-icon";
const RED = "bg-ui-tag-red-bg text-ui-tag-red-icon";
const PURPLE = "bg-ui-tag-purple-bg text-ui-tag-purple-icon";
const NEUTRAL = "bg-ui-tag-neutral-bg text-ui-tag-neutral-icon";

/** Keyed by notification `type`, plus `handoff` for "a customer needs a person". */
export const NOTIFICATION_ICONS: Record<string, NotificationIcon> = {
  handoff: { Icon: ChatBubbleLeftRight, className: RED },
  invitation: { Icon: Envelope, className: BLUE },
  request: { Icon: Users, className: PURPLE },
  success: { Icon: CheckCircle, className: GREEN },
  warning: { Icon: ExclamationCircle, className: ORANGE },
  error: { Icon: XCircle, className: RED },
  reminder: { Icon: Clock, className: BLUE },
  activity: { Icon: Bolt, className: NEUTRAL },
  system: { Icon: BellAlert, className: NEUTRAL },
  info: { Icon: InformationCircle, className: NEUTRAL },
};
