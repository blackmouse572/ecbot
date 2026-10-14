import { useChatbotKnowledgeItems } from "@/hooks/api/knowledge-base";
import { useChatbotSkills } from "@/hooks/api/skills";
import { useListChatbotTools } from "@/hooks/api/tools";
import { Button, Container, Drawer, Tabs } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotSkillsTab } from "../../components/chatbot-skills-tab";
import { ChatbotToolInvocations } from "../../components/chatbot-tool-invocations";
import { ChatbotToolsTab } from "../../components/chatbot-tools-tab";
import { ChatbotRAGSection } from "./chatbot-rag-section";
import { ChatbotSectionHeader } from "./chatbot-section-header";

type ChatbotCapabilitiesSectionProps = {
  item: ChatbotGetDetailResponseDto;
  workspace: string;
};

/**
 * What the agent can look up and do: knowledge, tools and skills share one
 * card, each tab counted so an empty one shows without opening it.
 */
export const ChatbotCapabilitiesSection: FC<
  ChatbotCapabilitiesSectionProps
> = ({ item, workspace }) => {
  const { t } = useTranslation();
  const [invocationsOpen, setInvocationsOpen] = useState(false);
  // The same queries the tabs run, so the counts cost no extra request.
  const { items } = useChatbotKnowledgeItems(item.id);
  const { tools } = useListChatbotTools(workspace, item.id);
  const { chatbotSkills } = useChatbotSkills(workspace, item.id);
  const tabs = [
    {
      value: "knowledge",
      label: t("knowledgeBase.title"),
      count: items?.length,
    },
    {
      value: "tools",
      label: t("tools.chatbotTab.title"),
      count: tools?.length,
    },
    {
      value: "skills",
      label: t("skills.chatbotTab.title"),
      count: chatbotSkills?.length,
    },
  ];

  return (
    <Container className="divide-y p-0">
      <ChatbotSectionHeader
        title={t("chatbot.details.capabilities.title")}
        description={t("chatbot.details.capabilities.description")}
      />
      <Tabs defaultValue="knowledge">
        <div className="px-6 py-3">
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="gap-x-1.5"
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-ui-fg-muted tabular-nums">
                    {tab.count}
                  </span>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
        <Tabs.Content value="knowledge" className="border-t">
          <ChatbotRAGSection item={item} />
        </Tabs.Content>
        <Tabs.Content value="tools" className="border-t">
          <ChatbotToolsTab chatbotId={item.id} workspace={workspace} />
          <div className="border-t px-6 py-3">
            <Button
              size="small"
              variant="transparent"
              className="text-ui-fg-interactive"
              onClick={() => setInvocationsOpen(true)}
            >
              {t("tools.invocations.title")}
            </Button>
          </div>
        </Tabs.Content>
        <Tabs.Content value="skills" className="border-t">
          <ChatbotSkillsTab chatbotId={item.id} workspace={workspace} />
        </Tabs.Content>
      </Tabs>

      <Drawer open={invocationsOpen} onOpenChange={setInvocationsOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{t("tools.invocations.title")}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto p-0">
            {invocationsOpen && (
              <ChatbotToolInvocations
                chatbotId={item.id}
                workspace={workspace}
              />
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};
