import {
  PromptInput,
  PromptInputBody,
  PromptInputEmojiButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@repo/ui/common-components";
import { useAIChat } from "./ai-chat-provider";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function AIChatInput() {
  const { status, onSubmit } = useAIChat();
  const isSubmitDisabled = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );
  const { t } = useTranslation();

  return (
    <PromptInput
      onSubmit={(messages) => onSubmit(messages.text)}
      className="[&>div]:rounded-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          data-testid="chat-input"
          placeholder={t("chatbot.chat.inputPlaceholder")}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputEmojiButton
          tooltip={t("general.emojiTooltip")}
          searchPlaceholder={t("general.emojiSearch")}
          noResultsLabel={t("general.emojiNoResults")}
          loadingLabel={t("general.emojiLoading")}
        />
        <PromptInputSubmit
          className="ml-auto bg-ui-bg-interactive text-ui-fg-on-color hover:bg-ui-bg-interactive/80"
          disabled={isSubmitDisabled}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
