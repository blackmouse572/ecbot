import { CheckCircleSolid, SquareTwoStack } from "@medusajs/icons";
import { IconButton, Text, clx, toast } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CopyFieldProps {
  label: string;
  value: string;
  /** Shown instead of `value` when the copied text differs from the display. */
  display?: string;
  /** Renders a multi-line block, for code snippets. */
  block?: boolean;
  onCopied?: () => void;
}

/** A labelled read-only value with a copy button. */
export const CopyField = ({
  label,
  value,
  display,
  block,
  onCopied,
}: CopyFieldProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("settings.clientCredentials.reveal.copied"));
      onCopied?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-y-1">
      <Text size="small" weight="plus">
        {label}
      </Text>
      <div
        className={clx(
          "bg-ui-bg-subtle flex gap-x-2 rounded-md border p-2",
          block ? "items-start" : "items-center",
        )}
      >
        {block ? (
          <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs">
            {display ?? value}
          </pre>
        ) : (
          <code className="min-w-0 flex-1 break-all font-mono text-xs">
            {display ?? value}
          </code>
        )}
        <IconButton
          type="button"
          size="small"
          variant="transparent"
          onClick={handleCopy}
          aria-label={`${t("settings.clientCredentials.reveal.copy")} ${label}`}
        >
          {copied ? <CheckCircleSolid /> : <SquareTwoStack />}
        </IconButton>
      </div>
    </div>
  );
};
