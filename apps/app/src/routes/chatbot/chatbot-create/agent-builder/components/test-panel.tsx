import { AIChatCard } from "@/components/ai-chat/ai-chat-card";
import { AIChatInput } from "@/components/ai-chat/ai-chat-input";
import { workspaceChatTransport } from "@/components/ai-chat/use-ai-chat-stream";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAuthToken } from "@/modules/auth";
import { compilePrompt, type AgentProfile } from "@repo/agent-blueprint";
import { Tabs, Text } from "@medusajs/ui";
import { MessageResponse } from "@repo/ui/common-components";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Props = { chatbotId: string | null; profile: AgentProfile | null; extraInstructions: string };

export function TestPanel({ chatbotId, profile, extraInstructions }: Props) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const token = useAuthToken();
  const transport = useMemo(() => workspaceChatTransport(workspaceSlug, chatbotId ?? ""), [workspaceSlug, chatbotId]);
  const prompt = useMemo(() => (profile ? compilePrompt(profile, { extraInstructions }) : ""), [profile, extraInstructions]);

  return (
    <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-3">
      <Tabs.List>
        <Tabs.Trigger value="chat">{t("agentBuilder.ui.tryAgent")}</Tabs.Trigger>
        <Tabs.Trigger value="prompt">{t("agentBuilder.ui.promptTab")}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="chat" className="min-h-0 flex-1">
        {chatbotId ? (
          <AIChatCard
            key={chatbotId}
            heading={t("agentBuilder.ui.tryAgent")}
            chatbotId={chatbotId}
            transport={transport}
            canSubmit={!!token}
            renderInput={<AIChatInput />}
            className="h-full"
          />
        ) : (
          <Text size="small" className="text-ui-fg-muted p-4 text-center">{t("agentBuilder.ui.testLocked")}</Text>
        )}
      </Tabs.Content>
      <Tabs.Content value="prompt" className="min-h-0 flex-1 overflow-y-auto">
        <MessageResponse>{prompt}</MessageResponse>
      </Tabs.Content>
    </Tabs>
  );
}
