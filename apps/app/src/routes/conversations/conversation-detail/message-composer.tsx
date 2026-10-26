import { useTranslation } from "react-i18next";
import {
  PromptInput,
  PromptInputBody,
  PromptInputEmojiButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@repo/ui/common-components";
import { POLICY_URL } from "./reaction-window";

interface Props {
  isSending: boolean;
  onSubmit: (text: string) => void;
  /** Meta's 24h messaging window has closed: Messenger/Instagram reject any reply. */
  windowClosed?: boolean;
}

export const MessageComposer = ({
  isSending,
  onSubmit,
  windowClosed = false,
}: Props) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <div inert={windowClosed} aria-hidden={windowClosed || undefined}>
        <PromptInput
          onSubmit={({ text }) => {
            if (windowClosed || !text.trim()) return;
            onSubmit(text.trim());
          }}
          className="[&>div]:rounded-none"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={t("conversations.composer.placeholder")}
              maxLength={4097}
              disabled={windowClosed}
              aria-label={t("conversations.composer.send")}
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
              disabled={windowClosed}
              aria-label={t("conversations.composer.send")}
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
