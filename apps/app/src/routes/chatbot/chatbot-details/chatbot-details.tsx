import { useChatbot } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import { useChatbotKnowledgeItems } from "@/hooks/api/knowledge-base";
import { Container, Tabs } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import { useLoaderData, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CHATBOT_DETAIL_TABS, type ChatbotDetailTab } from "../constants";
import {
  AccountList,
  ChatbotCapabilitiesSection,
  ChatbotGeneralKnowledgeSection,
  ChatbotGeneralSection,
  ChatbotLanguageSection,
  ChatbotMessagesSection,
  ChatbotNextStepsSection,
  ChatbotProfileSection,
  ChatbotSettingsSection,
  ChatbotStatsSection,
} from "./components";

import type { chatbotDetailsLoader } from "./loader";
import { AIChatCard } from "../../../components/ai-chat/ai-chat-card";
import { TestChatNotice } from "../../../components/ai-chat/test-chat-notice";
import { AIChatInput } from "../../../components/ai-chat/ai-chat-input";
import { workspaceChatTransport } from "../../../components/ai-chat/use-ai-chat-stream";
import { useAuthToken } from "@/modules/auth";
import { ChatbotShareDialog } from "./components/chatbot-share-dialog";

const isTab = (value: string | null): value is ChatbotDetailTab =>
  CHATBOT_DETAIL_TABS.some((tab) => tab === value);

/**
 * The open tab. It lives in state so it survives an edit drawer's route
 * (which drops the query), and follows `?tab=` when a link sets it.
 */
const useDetailTab = () => {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("tab");

  const [tab, setTab] = useState<ChatbotDetailTab>(
    isTab(fromUrl) ? fromUrl : "overview",
  );

  useEffect(() => {
    if (isTab(fromUrl)) setTab(fromUrl);
  }, [fromUrl]);

  const open = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setParams(
      (prev) => {
        prev.set("tab", value);

        return prev;
      },
      { replace: true },
    );
  };

  return [tab, open] as const;
};

export function ChatbotDetails() {
  const { t } = useTranslation();
  const [tab, openTab] = useDetailTab();

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

  const { items: knowledgeItems } = useChatbotKnowledgeItems(id);

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
    // SingleColumnPage renders the Outlet for each card's edit drawer.
    <SingleColumnPage>
      <Tabs
        value={tab}
        onValueChange={openTab}
        className="flex flex-col gap-y-3"
      >
        <ChatbotGeneralSection item={chatbot}>
          <Tabs.List>
            {CHATBOT_DETAIL_TABS.map((value) => (
              <Tabs.Trigger key={value} value={value}>
                {t(`chatbot.details.tabs.${value}`)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </ChatbotGeneralSection>
        <TwoColumnPage hasOutlet={false}>
          <TwoColumnPage.Main>
            <Tabs.Content value="overview" className="flex flex-col gap-y-3">
              <ChatbotStatsSection chatbotId={chatbot.id} />
              <Container className="p-0">
                <AccountList item={chatbot} accounts={chatbot.accounts} />
              </Container>
              <ChatbotNextStepsSection
                item={chatbot}
                knowledgeCount={knowledgeItems?.length}
                onOpenKnowledge={() => openTab("knowledge")}
              />
            </Tabs.Content>
            <Tabs.Content value="behaviour" className="flex flex-col gap-y-3">
              <ChatbotProfileSection item={chatbot} />
              <ChatbotGeneralKnowledgeSection item={chatbot} />
              <ChatbotMessagesSection item={chatbot} />
            </Tabs.Content>
            <Tabs.Content value="knowledge" className="flex flex-col gap-y-3">
              <ChatbotCapabilitiesSection
                item={chatbot}
                workspace={workspaceSlug}
              />
            </Tabs.Content>
            <Tabs.Content value="advanced" className="flex flex-col gap-y-3">
              <ChatbotLanguageSection item={chatbot} />
              <ChatbotSettingsSection item={chatbot} />
            </Tabs.Content>
          </TwoColumnPage.Main>
          {/* Trying the agent out stays beside every tab. */}
          <TwoColumnPage.Sidebar>
            <AIChatCard
              heading={t("chatbot.chat.heading")}
              subheading={<TestChatNotice />}
              chatbotId={chatbot.id}
              renderInput={<AIChatInput />}
              transport={chatTransport}
              canSubmit={!!token}
              renderHeaderActions={
                <ChatbotShareDialog chatbotId={chatbot.id} />
              }
              showKnowledgeSources
            />
          </TwoColumnPage.Sidebar>
        </TwoColumnPage>
      </Tabs>
    </SingleColumnPage>
  );
}
