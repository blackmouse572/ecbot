import { useTranslation } from "react-i18next";
import { toast } from "@medusajs/ui";
import type { ConversationGetResponseDto } from "@repo/client";
import {
  PromptInput,
  PromptInputBody,
  PromptInputEmojiButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@repo/ui/common-components";
import type { FileUIPart } from "ai";
import { AIChatInputAttachments } from "@/components/ai-chat/ai-chat-input-attachments";
import { ChatAttachButtons } from "@/components/ai-chat/chat-attach-buttons";
import { CHAT_ATTACH_MAX_IMAGES } from "@/components/ai-chat/constants";
import { POLICY_URL } from "./reaction-window";

interface Props {
  isSending: boolean;
  /** Rejects when the files could not be stored, so the box keeps them. */
  onSubmit: (text: string, files: FileUIPart[]) => void | Promise<void>;
  /** Meta's 24h messaging window has closed: Messenger/Instagram reject any reply. */
  windowClosed?: boolean;
  /** What the customer's channel takes from the inbox; text only when absent. */
  uploads?: ConversationGetResponseDto["uploads"];
}

export const MessageComposer = ({
  isSending,
  onSubmit,
  windowClosed = false,
  uploads,
}: Props) => {
  const { t } = useTranslation();
  const imageAccept = uploads?.image?.types.join(",");
  const fileAccept = uploads?.file?.types.join(",");
  const canAttach = !!(imageAccept || fileAccept);

  return (
    <div className="relative">
      <div inert={windowClosed} aria-hidden={windowClosed || undefined}>
        <PromptInput
          onSubmit={async ({ text, files }) => {
            if (windowClosed || (!text.trim() && !files.length)) return;
            await onSubmit(text.trim(), files);
          }}
          className="[&>div]:rounded-none"
          accept={
            canAttach
              ? [imageAccept, fileAccept].filter(Boolean).join(",")
              : undefined
          }
          multiple={canAttach}
          maxFiles={canAttach ? CHAT_ATTACH_MAX_IMAGES + 1 : 0}
          maxFileSize={
            canAttach
              ? Math.max(
                  uploads?.image?.maxBytes ?? 0,
                  uploads?.file?.maxBytes ?? 0,
                )
              : undefined
          }
          // A channel that takes text only drops pasted files without a word.
          onError={(error) =>
            canAttach &&
            toast.error(
              error.code === "max_files"
                ? t("chatbot.chat.attachLimit", {
                    count: CHAT_ATTACH_MAX_IMAGES,
                  })
                : t("conversations.composer.attachNotSupported"),
            )
          }
        >
          {canAttach && <AIChatInputAttachments />}
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={t("conversations.composer.placeholder")}
              maxLength={4097}
              disabled={windowClosed}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className="flex items-center gap-1">
              {canAttach && (
                <ChatAttachButtons
                  imageAccept={imageAccept}
                  fileAccept={fileAccept}
                  maxBytes={{
                    image: uploads?.image?.maxBytes,
                    file: uploads?.file?.maxBytes,
                  }}
                />
              )}
              <PromptInputEmojiButton
                tooltip={t("general.emojiTooltip")}
                searchPlaceholder={t("general.emojiSearch")}
                noResultsLabel={t("general.emojiNoResults")}
                loadingLabel={t("general.emojiLoading")}
              />
            </div>
            <PromptInputSubmit
              className="ml-auto bg-ui-bg-interactive text-ui-fg-on-color hover:bg-ui-bg-interactive/80"
              status={isSending ? "submitted" : "idle"}
              disabled={windowClosed}
              aria-label={t("actions.send")}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
      {windowClosed && (
        <div className="bg-ui-bg-base/80 absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center backdrop-blur-[2px]">
          <p className="txt-compact-small-plus text-ui-fg-base">
            {t("conversations.composer.windowClosed")}
          </p>
          <p className="txt-compact-small text-ui-fg-subtle">
            {t("conversations.composer.windowClosedHint")}{" "}
            <a
              href={POLICY_URL}
              target="_blank"
              rel="noreferrer"
              className="text-ui-fg-interactive underline"
            >
              {t("conversations.reactions.policyLink")}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};
