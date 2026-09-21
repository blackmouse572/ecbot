import { CheckCircleSolid, SquareTwoStack } from "@medusajs/icons";
import { IconButton, Input, Label, Text, Textarea, toast } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * A read-only value with a copy button — the shape used wherever the server
 * hands the operator something to paste elsewhere (see the chatbot share
 * dialog). Multiline values render as a textarea so an embed snippet stays
 * readable.
 */
export function CopyField({
  label,
  value,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(t("accounts.create.provision.copied"));
  };

  return (
    <div className="flex w-full flex-col gap-y-2">
      <Label size="xsmall" weight="plus">
        {label}
      </Label>
      <div className="flex w-full items-start gap-x-2 [&>div]:min-w-0 [&>div]:flex-1">
        {multiline ? (
          <Textarea readOnly value={value} rows={3} className="font-mono" />
        ) : (
          <Input readOnly value={value} className="font-mono" />
        )}
        <IconButton
          variant="transparent"
          className="shrink-0"
          onClick={handleCopy}
          aria-label={t("actions.copy")}
        >
          {copied ? <CheckCircleSolid /> : <SquareTwoStack />}
        </IconButton>
      </div>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
  );
}
