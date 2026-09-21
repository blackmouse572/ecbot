import { RouteFocusModal } from "@/components/modals";
import { useChatbot } from "@/hooks/api";
import { useParams } from "react-router-dom";
import { CloneChatbotForm } from "./components";

export function ChatbotClone() {
  const { id } = useParams();

  if (!id) {
    throw new Error("Chatbot ID is required");
  }

  const { chatbot } = useChatbot(id);

  return (
    <RouteFocusModal>
      {chatbot && (
        <CloneChatbotForm chatbotId={chatbot.id} sourceName={chatbot.name} />
      )}
    </RouteFocusModal>
  );
}
