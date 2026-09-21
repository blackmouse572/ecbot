import { useChatbot } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import { useMemo } from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AccountList } from "./components/account-list";
import { ChatbotGeneralSection } from "./components/chatbot-general-section/chatbot-general-section";
import { ChatbotRAGSection } from "./components/chatbot-rag-section";
import { ChatbotSummarySection } from "./components/chatbot-summary-section/chatbot-summary-section";
import { ChatbotToolsTab } from "../components/chatbot-tools-tab";
import { ChatbotSkillsTab } from "../components/chatbot-skills-tab";
import { ChatbotToolInvocations } from "../components/chatbot-tool-invocations";

import type { chatbotDetailsLoader } from "./loader";
import { ChatbotGeneralKnowledgeSection } from "./components/chatbot-general-knowledge/chatbot-general-knowledge";
import { AIChatCard } from "../../../components/ai-chat/ai-chat-card";
import { AIChatInput } from "../../../components/ai-chat/ai-chat-input";
import { workspaceChatTransport } from "../../../components/ai-chat/use-ai-chat-stream";
import { useAuthToken } from "@/modules/auth";
import { ChatbotShareDialog } from "./components/chatbot-share-dialog";

export function ChatbotDetails() {
  const { t } = useTranslation();
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof chatbotDetailsLoader>
  >;

  const { id } = useParams();
  const { workspaceSlug } = useWorkspaceParams();
  const token = useAuthToken();
  // Memoized so `useAiChat` keeps one transport across renders, the way it did
  // when it derived the path from these two values itself.
  const chatTransport = useMemo(
    () => workspaceChatTransport(workspaceSlug, id ?? ""),
    [workspaceSlug, id],
  );

  if (!id) {
    throw new Error("Chatbot ID is required");
  }

  const { chatbot, isLoading, isError, error } = useChatbot(id, {
    initialData,
  });

  if (isLoading || !chatbot) {
    return (
      <TwoColumnPageSkeleton
        mainSections={4}
        sidebarSections={3}
        showJSON
        showMetadata
      />
    );
  }

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage>
      <TwoColumnPage hasOutlet={false}>
        <TwoColumnPage.Main>
          <ChatbotGeneralSection item={chatbot} />
          <ChatbotGeneralKnowledgeSection item={chatbot} />
          <AccountList
            item={chatbot}
            accounts={chatbot.accounts}
            linkedCount={chatbot.accounts.length}
          />
          <ChatbotRAGSection item={chatbot} />
          <ChatbotToolsTab chatbotId={chatbot.id} workspace={workspaceSlug} />
          <ChatbotSkillsTab chatbotId={chatbot.id} workspace={workspaceSlug} />
          <ChatbotToolInvocations
            chatbotId={chatbot.id}
            workspace={workspaceSlug}
          />
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <ChatbotSummarySection item={chatbot} />
          <AIChatCard
            heading={t("chatbot.chat.heading")}
            chatbotId={chatbot.id}
            renderInput={<AIChatInput />}
            transport={chatTransport}
            canSubmit={!!token}
            renderHeaderActions={<ChatbotShareDialog chatbotId={chatbot.id} />}
          />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </SingleColumnPage>
  );
}
