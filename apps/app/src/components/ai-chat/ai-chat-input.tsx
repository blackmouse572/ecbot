import { PaperClip } from "@medusajs/icons";
import { toast } from "@medusajs/ui";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputEmojiButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { readApiError } from "@/libs/api-error";
import { AIChatInputAttachments } from "./ai-chat-input-attachments";
import { useAIChat } from "./ai-chat-provider";
import {
  CHAT_ATTACH_ACCEPT,
  CHAT_ATTACH_MAX_BYTES,
  CHAT_ATTACH_MAX_DOCUMENTS,
  CHAT_ATTACH_MAX_FILES,
  CHAT_ATTACH_MAX_IMAGES,
} from "./constants";

const AttachButton: FC = () => {
  const { openFileDialog } = usePromptInputAttachments();
  const { t } = useTranslation();
  return (
    <PromptInputButton
      variant="transparent"
      tooltip={t("chatbot.chat.attach")}
      aria-label={t("chatbot.chat.attach")}
      data-testid="chat-attach"
      onClick={openFileDialog}
    >
      <PaperClip />
    </PromptInputButton>
  );
};

export function AIChatInput() {
  const { status, onSubmit, canAttach, uploading } = useAIChat();
  const isSubmitDisabled =
    status === "streaming" || status === "submitted" || uploading;
  const { t } = useTranslation();

  // A failed upload keeps the message and its files in the input (the
  // rejection tells PromptInput not to clear), so the person can retry.
  const submit = async (
    text: string,
    files: Parameters<typeof onSubmit>[1],
  ) => {
    try {
      await onSubmit(text, files);
    } catch (error) {
      toast.error(
        readApiError(error).message ?? t("chatbot.chat.attachFailed"),
      );
      throw error;
    }
  };

  return (
    <PromptInput
      onSubmit={(message) => submit(message.text, message.files)}
      className="[&>div]:rounded-none"
      accept={canAttach ? CHAT_ATTACH_ACCEPT : undefined}
      multiple={canAttach}
      maxFiles={canAttach ? CHAT_ATTACH_MAX_FILES : 0}
      maxFileSize={CHAT_ATTACH_MAX_BYTES}
      // A text-only surface drops pasted files without a word.
      onError={(error) =>
        canAttach &&
        toast.error(
          error.code === "max_files"
            ? t("chatbot.chat.attachTooMany", {
                images: CHAT_ATTACH_MAX_IMAGES,
                files: CHAT_ATTACH_MAX_DOCUMENTS,
              })
            : t("chatbot.chat.attachNotSupported"),
        )
      }
    >
      {canAttach && <AIChatInputAttachments />}
      <PromptInputBody>
        <PromptInputTextarea
          data-testid="chat-input"
          placeholder={t("chatbot.chat.inputPlaceholder")}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div className="flex items-center gap-1">
          {canAttach && <AttachButton />}
          <PromptInputEmojiButton
            tooltip={t("general.emojiTooltip")}
            searchPlaceholder={t("general.emojiSearch")}
            noResultsLabel={t("general.emojiNoResults")}
            loadingLabel={t("general.emojiLoading")}
          />
        </div>
        <PromptInputSubmit
          className="ml-auto bg-ui-bg-interactive text-ui-fg-on-color hover:bg-ui-bg-interactive/80"
          disabled={isSubmitDisabled}
          aria-label={t("actions.send")}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
