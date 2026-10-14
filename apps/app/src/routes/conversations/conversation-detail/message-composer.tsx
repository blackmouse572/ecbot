import { useTranslation } from "react-i18next";
import {
  PromptInput,
  PromptInputBody,
  PromptInputEmojiButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@repo/ui/common-components";

interface Props {
  isSending: boolean;
  onSubmit: (text: string) => void;
}

export const MessageComposer = ({ isSending, onSubmit }: Props) => {
  const { t } = useTranslation();

  return (
    <PromptInput
      onSubmit={({ text }) => {
        if (!text.trim()) return;
        onSubmit(text.trim());
      }}
      className="[&>div]:rounded-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={t("conversations.composer.placeholder")}
          maxLength={4097}
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
          status={isSending ? "submitted" : "idle"}
        />
      </PromptInputFooter>
    </PromptInput>
  );
};
