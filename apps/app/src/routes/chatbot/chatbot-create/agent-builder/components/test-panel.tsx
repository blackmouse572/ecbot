import { AIChatCard } from "@/components/ai-chat/ai-chat-card";
import { AIChatInput } from "@/components/ai-chat/ai-chat-input";
import { workspaceChatTransport } from "@/components/ai-chat/use-ai-chat-stream";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAuthToken } from "@/modules/auth";
import { compilePrompt, type AgentProfile } from "@repo/agent-blueprint";
import { Tabs } from "@medusajs/ui";
import { ScrollArea } from "@repo/ui/components";
import { MessageResponse } from "@repo/ui/common-components";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  chatbotId: string;
  profile: AgentProfile | null;
  extraInstructions: string;
  /** "Talk with {{name}}"'s name, computed once by the caller (agent-builder.tsx). */
  agentDisplayName: string;
};

export function TestPanel({ chatbotId, profile, extraInstructions, agentDisplayName }: Props) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const token = useAuthToken();
  const transport = useMemo(() => workspaceChatTransport(workspaceSlug, chatbotId), [workspaceSlug, chatbotId]);
  const prompt = useMemo(() => (profile ? compilePrompt(profile, { extraInstructions }) : ""), [profile, extraInstructions]);
  const tryAgentLabel = t("agentBuilder.ui.tryAgent", { name: agentDisplayName });

  return (
    <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-3">
      <Tabs.List>
        <Tabs.Trigger value="chat" className="min-w-0 max-w-[200px]" title={tryAgentLabel}>
          <span className="truncate">{tryAgentLabel}</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="prompt">{t("agentBuilder.ui.promptTab")}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="chat" className="min-h-0 flex-1">
        <AIChatCard
          key={chatbotId}
          heading={tryAgentLabel}
          chatbotId={chatbotId}
          transport={transport}
          canSubmit={!!token}
          renderInput={<AIChatInput />}
          className="h-full"
        />
      </Tabs.Content>
      <Tabs.Content value="prompt" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <MessageResponse>{prompt}</MessageResponse>
        </ScrollArea>
      </Tabs.Content>
    </Tabs>
  );
}
