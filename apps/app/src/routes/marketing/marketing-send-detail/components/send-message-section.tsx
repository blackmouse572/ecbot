import type { MarketingSendGetResponseDto } from "@/hooks/api/marketing-sends";
import "@/styles/chat-bubble.css";
import { Container, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { SendMessageText } from "./send-message-text";

type SendMessageSectionProps = { send: MarketingSendGetResponseDto };

/** Tin đang gửi (AUTO) or Tin đã gửi (ONCE). */
export const SendMessageSection: FC<SendMessageSectionProps> = ({ send }) => {
  const { t } = useTranslation();

  return (
    <Container className="p-0">
      <div className="px-6 pt-4">
        <Heading level="h2">
          {t(`marketing.sends.message.${send.mode}`)}
        </Heading>
      </div>
      {/* Shown as the customer gets it: the shop's bubble, then the photo. */}
      <div
        data-align="start"
        className="flex flex-col items-start gap-y-2 px-6 py-4"
      >
        <div className="chat-bubble chat-bubble--bot max-w-[85%] whitespace-pre-line break-words">
          <SendMessageText text={send.text} />
        </div>
        {send.imageUrl && (
          <img
            src={send.imageUrl}
            alt=""
            className="shadow-borders-base max-h-48 max-w-[85%] rounded-2xl object-cover"
          />
        )}
        {send.mode === "AUTO" && send.active && (
          <Text size="xsmall" className="text-ui-fg-muted pt-1">
            {t("marketing.sends.message.editHint")}
          </Text>
        )}
      </div>
    </Container>
  );
};
