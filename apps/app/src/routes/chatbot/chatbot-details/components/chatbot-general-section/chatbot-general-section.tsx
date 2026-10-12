import {
  useToggleChatbotActivate,
  type ChatbotGetDetailResponseDto,
} from "@/hooks/api";
import { ChatbotActions } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-actions";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { useUISound } from "@/modules/sound";
import { Container, Switch } from "@medusajs/ui";

type ChatbotGeneralSectionProps = {
  item: ChatbotGetDetailResponseDto;
};

export const ChatbotGeneralSection = ({ item }: ChatbotGeneralSectionProps) => {
  const toggle = useToggleChatbotActivate();
  const playSound = useUISound();
  const turningOn = item.status === "inactive";

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <ChatbotNameCell name={item.name} avatar={item.avatar} />
        </div>
        <div className="flex items-center gap-x-4">
          <Switch
            checked={item.status !== "inactive"}
            disabled={toggle.isPending}
            onCheckedChange={() =>
              toggle.mutate(
                { id: item.id, active: turningOn },
                { onSuccess: () => turningOn && playSound("toggle-on") },
              )
            }
          />
          <ChatbotActions item={item} />
        </div>
      </div>
    </Container>
  );
};
