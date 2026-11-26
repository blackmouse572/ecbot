import type { MarketingSendGetResponseDto } from "@/hooks/api/marketing-sends";
import { Container, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { SendMessageText } from "./send-message-text";

type SendMessageSectionProps = { send: MarketingSendGetResponseDto };

/** Tin đang gửi (AUTO) or Tin đã gửi (ONCE). */
export const SendMessageSection: FC<SendMessageSectionProps> = ({ send }) => {
  const { t } = useTranslation();

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">
          {t(`marketing.sends.message.${send.mode}`)}
        </Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        {send.imageUrl && (
          <img
            src={send.imageUrl}
            alt=""
            className="shadow-borders-base max-h-48 w-fit rounded-lg object-contain"
          />
        )}
        <SendMessageText text={send.text} />
        {send.mode === "AUTO" && send.active && (
          <Text size="xsmall" className="text-ui-fg-muted">
            {t("marketing.sends.message.editHint")}
          </Text>
        )}
      </div>
    </Container>
  );
};
