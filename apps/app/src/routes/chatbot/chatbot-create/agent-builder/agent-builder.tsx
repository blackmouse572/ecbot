import { RouteFocusModal } from "@/components/modals";
import { useChatbot } from "@/hooks/api";
import { Button, IconButton, Text, clx } from "@medusajs/ui";
import { XMark } from "@medusajs/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { BuilderThread } from "./components/builder-thread";
import { TestPanel } from "./components/test-panel";
import { useAgentBuilder } from "./use-agent-builder";

export function AgentBuilder() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const hydrateId = params.get("chatbotId") ?? "";
  const { chatbot } = useChatbot(hydrateId, { enabled: !!hydrateId });
  const builder = useAgentBuilder({ hydrateFrom: hydrateId ? chatbot : undefined });
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <RouteFocusModal.Header>
        <Text size="small" className="text-ui-fg-subtle">{t("agentBuilder.ui.title")}</Text>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="grid grid-cols-1 overflow-hidden md:grid-cols-[1fr_420px]">
        <div className="min-h-0 overflow-hidden">
          <BuilderThread {...builder} />
        </div>
        <aside
          className={clx(
            "bg-ui-bg-subtle fixed inset-0 z-40 flex-col gap-2 p-4 md:static md:z-auto md:flex md:border-l md:border-ui-border-base",
            panelOpen ? "flex" : "hidden",
          )}
        >
          <div className="flex justify-end md:hidden">
            <IconButton variant="transparent" onClick={() => setPanelOpen(false)}>
              <XMark />
              <span className="sr-only">{t("actions.close")}</span>
            </IconButton>
          </div>
          <TestPanel chatbotId={builder.state.chatbotId} profile={builder.state.profile} extraInstructions={builder.extraInstructions} />
        </aside>
        {builder.state.profile && (
          <Button className="fixed bottom-4 right-4 z-30 md:hidden" onClick={() => setPanelOpen(true)}>
            {t("agentBuilder.ui.tryAgent")}
          </Button>
        )}
      </RouteFocusModal.Body>
    </>
  );
}
