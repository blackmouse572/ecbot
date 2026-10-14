import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import { useUpdateChatbot } from "@/hooks/api/chatbot";
import { Button, Container, Text, toast } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { ChatbotSectionHeader } from "../chatbot-section-header";
import { ChatbotPromptDrawer } from "./chatbot-prompt-drawer";

type Props = {
  item: ChatbotGetDetailResponseDto;
};

export const ChatbotGeneralKnowledgeSection = ({ item }: Props) => {
  const { t } = useTranslation();
  const update = useUpdateChatbot();
  const [editing, setEditing] = useState(false);
  // Builder agents keep their compiled prompt in generalKnowledge; this section
  // is only the extra instructions (#172). Legacy agents have no profile, so
  // their generalKnowledge is what the owner wrote.
  const saved =
    item.extraInstructions ??
    (item.agentProfile ? "" : (item.generalKnowledge ?? ""));
  const [draft, setDraft] = useState(saved);
  const [promptOpen, setPromptOpen] = useState(false);
  // Only builder agents compile a prompt beyond what the owner typed here.
  const compiledPrompt = item.agentProfile ? item.generalKnowledge : null;

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: item.id,
        body: { extraInstructions: draft },
      });
      toast.success(t("chatbot.details.generalKnowledgeSaved"));
      setEditing(false);
    } catch {
      toast.error(t("chatbot.details.generalKnowledgeSaveFailed"));
    }
  };

  const handleCancel = () => {
    setDraft(saved);
    setEditing(false);
  };

  return (
    <Container className="divide-y p-0">
      <ChatbotSectionHeader
        title={t("agentBuilder.ui.extraInstructions")}
        description={t("agentBuilder.ui.extraInstructionsHint")}
        actions={
          !editing && (
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                setDraft(saved);
                setEditing(true);
              }}
            >
              {t("actions.edit")}
            </Button>
          )
        }
      />

      {editing ? (
        <div className="flex flex-col gap-4">
          <TipTapEditor
            className="rounded-none border-t-0 border-x-0"
            value={draft}
            onChange={setDraft}
            placeholder={t("agentBuilder.ui.extraInstructionsHint")}
            format="markdown"
          />
          <div className="flex justify-end gap-2 p-6 pb-4 pt-0">
            <Button variant="secondary" size="small" onClick={handleCancel}>
              {t("actions.cancel")}
            </Button>
            <Button
              size="small"
              isLoading={update.isPending}
              onClick={handleSave}
            >
              {t("actions.save")}
            </Button>
          </div>
        </div>
      ) : !saved.trim() ? (
        <Text size="small" className="p-6 py-4 text-ui-fg-muted">
          {t("chatbot.details.messages.notSet")}
        </Text>
      ) : (
        <div className="scroll-fade-y max-h-96 overflow-y-auto p-6 py-4 prose max-w-none txt-compact-small text-ui-fg-subtle">
          <ReactMarkdown
            components={{
              ul: ({ children }) => (
                <ul className="list-disc pl-5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5">{children}</ol>
              ),
            }}
          >
            {saved}
          </ReactMarkdown>
        </div>
      )}

      {compiledPrompt && (
        <div className="px-6 py-3">
          <Button
            size="small"
            variant="transparent"
            className="text-ui-fg-interactive"
            onClick={() => setPromptOpen(true)}
          >
            {t("agentBuilder.ui.showFullPrompt")}
          </Button>
          <ChatbotPromptDrawer
            open={promptOpen}
            onOpenChange={setPromptOpen}
            prompt={compiledPrompt}
          />
        </div>
      )}
    </Container>
  );
};
