import { Input, Label, Text } from "@medusajs/ui";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** A bot token from @BotFather: numeric id, a colon, then a 35+ char secret. */
export const TELEGRAM_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]{35,}$/;

/**
 * The Telegram bot-token input, shared by the accounts create form
 * (`ConnectStep`) and the agent builder's channel connect card — both send
 * the token through `useLinkAccount` as `{ code: botToken, platform:
 * "TELEGRAM_BOT" }`, so the field itself (label, placeholder, hint) should
 * never drift between the two.
 */
export function TelegramTokenField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="flex w-full flex-col gap-y-2">
      <Label htmlFor={id} size="xsmall" weight="plus">
        {t("accounts.create.connect.telegram.tokenLabel")}
      </Label>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        placeholder={t("accounts.create.connect.telegram.tokenPlaceholder")}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("accounts.create.connect.telegram.tokenHint")}
      </Text>
      {error && (
        <Text size="xsmall" className="text-ui-fg-error">
          {error}
        </Text>
      )}
    </div>
  );
}
