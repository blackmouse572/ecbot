import type { MarketingSendDraftRequestDto } from "@/hooks/api/marketing-sends";
import { Badge, Input } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { MarketingSendFormData } from "../../schemas";
import { SendMessageEditor } from "./send-message-editor";
import { SendRewriteActions } from "./send-rewrite-actions";
import { SendStep } from "./send-step";

type Rewrite = NonNullable<MarketingSendDraftRequestDto["rewrite"]>;

type SendMessageProps = {
  form: UseFormReturn<MarketingSendFormData>;
  drafting: boolean;
  onWrite: (rewrite?: Rewrite) => void;
};

/** Tin nhắn: the offer, the AI-written text, and how to rewrite it. */
export const SendMessage: FC<SendMessageProps> = ({
  form,
  drafting,
  onWrite,
}) => {
  const { t } = useTranslation();
  const text = form.watch("text");
  const hasText = text.trim().length > 0;
  const tone = form.watch("tone");

  return (
    <SendStep
      step={2}
      title={t("marketing.send.message.title")}
      action={
        <Badge size="2xsmall" color="blue">
          {t("marketing.send.message.drafted")}
        </Badge>
      }
    >
      <Form.Field
        control={form.control}
        name="offer"
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>
              {t("marketing.send.message.offer")}
            </Form.Label>
            <Form.Control>
              <Input
                {...field}
                placeholder={t("marketing.send.message.offerPlaceholder")}
              />
            </Form.Control>
            <Form.Hint>{t("marketing.send.message.offerHint")}</Form.Hint>
          </Form.Item>
        )}
      />
      <Form.Field
        control={form.control}
        name="text"
        render={({ field, fieldState }) => (
          <Form.Item>
            <Form.Label>{t("marketing.send.message.text")}</Form.Label>
            <SendMessageEditor
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={drafting}
              invalid={!!fieldState.error}
              placeholder={t(
                drafting
                  ? "marketing.send.message.drafting"
                  : "marketing.send.message.placeholder",
              )}
              actions={
                <SendRewriteActions
                  tone={tone}
                  disabled={drafting || !hasText}
                  onRewrite={(rewrite, value) => {
                    if (value) form.setValue("tone", value);
                    onWrite(rewrite);
                  }}
                />
              }
            />
            <Form.Hint>{t("marketing.send.message.previewHint")}</Form.Hint>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </SendStep>
  );
};
