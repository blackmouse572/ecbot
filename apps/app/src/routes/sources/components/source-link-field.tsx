import { CheckCircleSolid, SquareTwoStack } from "@medusajs/icons";
import { Button, Text, toast } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type SourceLinkFieldProps = {
  url: string | null;
};

/** The link customers open, with a copy button. */
export const SourceLinkField: FC<SourceLinkFieldProps> = ({ url }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!url) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        {t("customerSources.share.noUrl")}
      </Text>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("customerSources.share.copied"));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-x-2 rounded-md border border-ui-border-base bg-ui-bg-subtle py-1 pl-3 pr-1">
      <code className="code-label min-w-0 flex-1 truncate font-mono text-ui-fg-base">
        {url.replace(/^https:\/\//, "")}
      </code>
      <Button
        size="small"
        variant="secondary"
        type="button"
        onClick={handleCopy}
      >
        {copied ? <CheckCircleSolid /> : <SquareTwoStack />}
        {t("customerSources.share.copy")}
      </Button>
    </div>
  );
};
