import {
  useChatbotSkills,
  useDetachSkillFromChatbot,
  useToggleSkillOnChatbot,
} from "@/hooks/api/skills";
import { PlusMini, Trash } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  IconButton,
  Switch,
  Text,
  toast,
} from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotSkillAddDrawer } from "./chatbot-skill-add-drawer";

type Props = {
  chatbotId: string;
  workspace: string;
};

export function ChatbotSkillsTab({ chatbotId, workspace }: Props) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { chatbotSkills, isLoading, isError } = useChatbotSkills(
    workspace,
    chatbotId,
  );
  const { toggleSkillOnChatbot } = useToggleSkillOnChatbot(
    workspace,
    chatbotId,
  );
  const { detachSkillFromChatbot } = useDetachSkillFromChatbot(
    workspace,
    chatbotId,
  );

  const handleToggle = async (skillId: string, enabled: boolean) => {
    try {
      await toggleSkillOnChatbot({ skillId, enabled });
    } catch {
      toast.error(t("skills.chatbotTab.updateError"));
    }
  };

  const handleDetach = async (skillId: string) => {
    try {
      await detachSkillFromChatbot(skillId);
      toast.success(t("skills.chatbotTab.detachSuccess"));
    } catch {
      toast.error(t("skills.chatbotTab.detachError"));
    }
  };

  return (
    <Container className="p-0">
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Heading level="h3" className="text-lg font-semibold">
            {t("skills.chatbotTab.title")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.chatbotTab.subtitle")}
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => setDrawerOpen(true)}
        >
          <PlusMini />
          {t("actions.add")}
        </Button>
      </div>

      {isError ? (
        <div className="px-6 py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.chatbotTab.loadError")}
          </Text>
        </div>
      ) : isLoading ? (
        <div className="px-6 py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.list.loading")}
          </Text>
        </div>
      ) : chatbotSkills.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.chatbotTab.empty")}
          </Text>
        </div>
      ) : (
        <ul className="divide-y divide-ui-border-base">
          {chatbotSkills.map((skill) => (
            <li
              key={skill.id}
              className="flex items-center justify-between gap-3 px-6 py-3"
            >
              <div className="min-w-0">
                <span className="txt-compact-small font-medium">
                  {skill.name}
                </span>
                {skill.description && (
                  <span className="block txt-compact-xsmall text-ui-fg-subtle line-clamp-1">
                    {skill.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={skill.enabled}
                  onCheckedChange={(v) => handleToggle(skill.id, v)}
                />
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={() => handleDetach(skill.id)}
                >
                  <Trash />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ChatbotSkillAddDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chatbotId={chatbotId}
        workspace={workspace}
        attachedSkillIds={chatbotSkills.map((s) => s.id)}
      />
    </Container>
  );
}
