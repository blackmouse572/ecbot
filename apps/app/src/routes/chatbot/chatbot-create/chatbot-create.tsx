import { RouteFocusModal } from "@/components/modals";
import { AgentBuilder } from "./agent-builder/agent-builder";

export function ChatbotCreate() {
  return (
    <RouteFocusModal>
      <AgentBuilder />
    </RouteFocusModal>
  );
}
