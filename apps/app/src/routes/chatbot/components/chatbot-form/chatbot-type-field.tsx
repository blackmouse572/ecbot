import { Button } from "@medusajs/ui";
import { useMemo } from "react";
import { CHATBOT_TYPE_ICON_COMPONENTS } from "../../chatbot-list/components/chatbot-list-table/chatbot-type-icons";
import { CHATBOT_TYPE_CONFIG } from "../../constants";

interface ChatbotTypeFieldProps {
  value?: string;
  onChange: (value: string) => void;
}

export function ChatbotTypeField({ value, onChange }: ChatbotTypeFieldProps) {
  const chatbotTypes = useMemo(() => {
    return Object.entries(CHATBOT_TYPE_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
      color: config.color,
      icon: config.icon,
    }));
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {chatbotTypes.map((type) => {
        const IconComponent =
          CHATBOT_TYPE_ICON_COMPONENTS[
            type?.icon as keyof typeof CHATBOT_TYPE_ICON_COMPONENTS
          ];
        return (
          <Button
            key={type.value}
            type="button"
            data-selected={value === type.value}
            variant={value === type.value ? "primary" : "secondary"}
            onClick={() => onChange(type.value)}
            className="data-[selected=true]:opacity-100 opacity-50"
          >
            <IconComponent
              size={14}
              className={`text-ui-tag-${type.color}-icon`}
            />
            <span>{type.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
