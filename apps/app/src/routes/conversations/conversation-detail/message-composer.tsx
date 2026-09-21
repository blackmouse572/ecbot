import { Tooltip } from "@medusajs/ui";
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
  disabled?: boolean;
  disabledReason?: string;
  isSending: boolean;
  onSubmit: (text: string) => void;
}

export const MessageComposer = ({
  disabled,
  disabledReason,
  isSending,
  onSubmit,
}: Props) => {
  const { t } = useTranslation();

  const composer = (
    <PromptInput
      onSubmit={({ text }) => {
        if (!text.trim() || disabled) return;
        onSubmit(text.trim());
      }}
      className="[&>div]:rounded-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={disabled ? "" : t("conversations.composer.placeholder")}
          disabled={disabled}
          maxLength={4097}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputEmojiButton
          disabled={disabled}
          tooltip={t("general.emojiTooltip")}
          searchPlaceholder={t("general.emojiSearch")}
          noResultsLabel={t("general.emojiNoResults")}
          loadingLabel={t("general.emojiLoading")}
        />
        <PromptInputSubmit
          className="ml-auto bg-ui-bg-interactive text-ui-fg-on-color hover:bg-ui-bg-interactive/80"
          status={isSending ? "submitted" : "idle"}
          disabled={disabled}
        />
      </PromptInputFooter>
    </PromptInput>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip content={disabledReason}>
        <div>{composer}</div>
      </Tooltip>
    );
  }

  return composer;
};
