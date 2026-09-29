import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import { useUpdateChatbot } from "@/hooks/api/chatbot";
import { Pencil } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  IconButton,
  Text,
  toast,
} from "@medusajs/ui";
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
  // Builder agents keep their compiled prompt in generalKnowledge; this section
  // is only the extra instructions (#172). Legacy agents have no profile, so
  // their generalKnowledge is what the owner wrote.
  const saved =
    item.extraInstructions ??
    (item.agentProfile ? "" : (item.generalKnowledge ?? ""));
  const [draft, setDraft] = useState(saved);

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
      <div className="flex items-center justify-between p-6 py-4">
        <Heading>{t("agentBuilder.ui.extraInstructions")}</Heading>
        {!editing && (
          <IconButton
            variant="transparent"
            size="small"
            onClick={() => {
              setDraft(saved);
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
          {t("agentBuilder.ui.extraInstructionsHint")}
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
    </Container>
  );
};
