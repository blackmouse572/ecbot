import { CHATBOT_TYPE_ICON_COMPONENTS } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-icons";
import { CHATBOT_TYPE_CONFIG } from "@/routes/chatbot/constants";

/**
 * The same business-type -> icon lookup the chatbot list uses
 * (`chatbot-type-field.tsx`), at the 16px size the builder's choice cards use.
 */
export function businessTypeIcon(value: string) {
  const config = CHATBOT_TYPE_CONFIG[value as keyof typeof CHATBOT_TYPE_CONFIG];
  if (!config) return undefined;
  const Icon = CHATBOT_TYPE_ICON_COMPONENTS[config.icon as keyof typeof CHATBOT_TYPE_ICON_COMPONENTS];
  return Icon ? <Icon size={16} /> : undefined;
}
