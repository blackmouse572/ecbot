import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import { useUpdateChatbot } from "@/hooks/api/chatbot";
import { Pencil } from "@medusajs/icons";
import { Button, Container, Heading, IconButton, toast } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

type Props = {
  item: ChatbotGetDetailResponseDto;
};

export const ChatbotGeneralKnowledgeSection = ({ item }: Props) => {
  const { t } = useTranslation();
  const update = useUpdateChatbot();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.generalKnowledge ?? "");

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: item.id,
        body: {
          name: item.name,
          generalKnowledge: draft,
          accounts: item.accounts.map((a) => a.id),
          type: item.type,
          autoRead: item.autoRead,
          typingIndicator: item.typingIndicator,
          primaryLanguage: item.primaryLanguage,
          deferedLanguage: item.deferedLanguage ?? undefined,
          welcomeMessage: item.welcomeMessage ?? undefined,
          fallbackMessage: item.fallbackMessage ?? undefined,
          modelTextName: item.modelTextName,
          modelTemperature: item.modelTemperature,
          maxTokens: item.maxTokens ?? undefined,
          handoffFallbackThreshold: item.handoffFallbackThreshold,
        },
      });
      toast.success(t("chatbot.details.generalKnowledgeSaved"));
      setEditing(false);
    } catch {
      toast.error(t("chatbot.details.generalKnowledgeSaveFailed"));
    }
  };

  const handleCancel = () => {
    setDraft(item.generalKnowledge ?? "");
    setEditing(false);
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between p-6 py-4">
        <Heading>{t("chatbot.edit.generalKnowledge")}</Heading>
        {!editing && (
          <IconButton
            variant="transparent"
            size="small"
            onClick={() => {
              setDraft(item.generalKnowledge ?? "");
              setEditing(true);
            }}
          >
            <Pencil />
          </IconButton>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <TipTapEditor
            className="rounded-none border-t-0 border-x-0"
            value={draft}
            onChange={setDraft}
            placeholder={t("chatbot.edit.generalKnowledgePlaceholder")}
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
            {item.generalKnowledge ?? ""}
          </ReactMarkdown>
        </div>
      )}
    </Container>
  );
};
