import { Input, Label, Text } from "@medusajs/ui";
import { useId, type Ref } from "react";
import { useTranslation } from "react-i18next";

/** A bot token from @BotFather: numeric id, a colon, then a 35+ char secret. */
export const TELEGRAM_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]{35,}$/;

/**
 * The Telegram bot-token input, shared by the accounts create form
 * (`ConnectStep`) and the agent builder's channel connect card; both send
 * the token through `useLinkAccount` as `{ code: botToken, platform:
 * "TELEGRAM_BOT" }`, so the field itself (label, placeholder, hint) should
 * never drift between the two.
 */
export function TelegramTokenField({
  ref,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  label,
}: {
  /** RHF's `field.ref`, so focus-on-invalid reaches the input. */
  ref?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  /** Defaults to the accounts form's own label; the builder passes its own
   * ("Bot token from @BotFather") so the two contexts can read differently
   * while still sharing the field, the validation message and the hint. */
  label?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="flex w-full flex-col gap-y-2">
      <Label htmlFor={id} size="xsmall" weight="plus">
        {label ?? t("accounts.create.connect.telegram.tokenLabel")}
      </Label>
      <Input
        ref={ref}
        id={id}
        type="password"
        aria-invalid={!!error}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        autoComplete="off"
        placeholder={t("accounts.create.connect.telegram.tokenPlaceholder")}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <Text id={hintId} size="xsmall" className="text-ui-fg-subtle">
        {t("accounts.create.connect.telegram.tokenHint")}
      </Text>
      {error && (
        <Text id={errorId} size="xsmall" className="text-ui-fg-error">
          {error}
        </Text>
      )}
    </div>
  );
}
