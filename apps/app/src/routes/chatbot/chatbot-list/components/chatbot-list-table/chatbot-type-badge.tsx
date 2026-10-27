import type { ChatbotTypeConfigItem } from "@/routes/chatbot/constants";
import { Badge, clx } from "@medusajs/ui";
import {
  CHATBOT_TYPE_ICON_COMPONENTS,
  type ChatbotTypeIconName,
} from "./chatbot-type-icons";

type ChatbotTypeIconProps = {
  config: ChatbotTypeConfigItem;
  size?: number;
  className?: string;
};

/** Resolves a type config to its icon; renders nothing for an unknown name. */
export const ChatbotTypeIcon = ({
  config,
  size,
  className,
}: ChatbotTypeIconProps) => {
  const Icon = CHATBOT_TYPE_ICON_COMPONENTS[config.icon as ChatbotTypeIconName];

  return Icon ? <Icon size={size} className={className} /> : null;
};

type ChatbotTypeBadgeProps = {
  config: ChatbotTypeConfigItem;
  size: "small" | "xsmall";
  /** Clamp the label to one line, for the tighter table cell. */
  clamp?: boolean;
};

/** Pill showing a chatbot's industry: coloured icon plus its label. */
export const ChatbotTypeBadge = ({
  config,
  size,
  clamp,
}: ChatbotTypeBadgeProps) => (
  <Badge
    color={config.color}
    size={size}
    className="max-w-full shrink-0 rounded-full"
  >
    <div className="flex min-w-0 items-center gap-1">
      <ChatbotTypeIcon config={config} size={14} className="shrink-0" />
      {/* Clamp the label, not the row: line-clamp swaps flex for a block box
          and the icon would stack above the text. */}
      <span className={clx(clamp && "truncate")}>{config.label}</span>
    </div>
  </Badge>
);
