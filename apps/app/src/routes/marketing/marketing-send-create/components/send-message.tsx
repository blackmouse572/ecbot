import type { MarketingSendDraftRequestDto } from "@/hooks/api/marketing-sends";
import { Badge, Button, DropdownMenu, Input } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { ChevronDownMini, Sparkles } from "@medusajs/icons";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  MARKETING_DRAFT_LENGTHS,
  MARKETING_DRAFT_TONES,
} from "../../constants";
import type { MarketingSendFormData } from "../../schemas";
import { SendMessageEditor } from "./send-message-editor";
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
                <>
                  {/* Viết lại only asks how: each tone rewrites in it. */}
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        size="small"
                        variant="transparent"
                        type="button"
                        disabled={drafting || !hasText}
                      >
                        <Sparkles />
                        {t("marketing.send.message.rewrite.DIFFERENT")}
                        <ChevronDownMini />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="start">
                      <DropdownMenu.Label className="px-2 py-1.5">
                        {t("marketing.send.message.tone")}
                      </DropdownMenu.Label>
                      <DropdownMenu.RadioGroup value={tone}>
                        {MARKETING_DRAFT_TONES.map((value) => (
                          <DropdownMenu.RadioItem
                            key={value}
                            value={value}
                            // onSelect, not onValueChange: the current tone
                            // rewrites too.
                            onSelect={() => {
                              form.setValue("tone", value);
                              onWrite("DIFFERENT");
                            }}
                          >
                            {t(`marketing.send.message.tones.${value}`)}
                          </DropdownMenu.RadioItem>
                        ))}
                      </DropdownMenu.RadioGroup>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                  {MARKETING_DRAFT_LENGTHS.map((rewrite) => (
                    <Button
                      key={rewrite}
                      size="small"
                      variant="transparent"
                      type="button"
                      disabled={drafting || !hasText}
                      onClick={() => onWrite(rewrite)}
                    >
                      {t(`marketing.send.message.rewrite.${rewrite}`)}
                    </Button>
                  ))}
                </>
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
