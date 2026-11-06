import type { ClientCredentialCreateResponseDto } from "@/hooks/api/client-credentials";
import { Badge, Checkbox, Label, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { mcpConfigSnippet } from "../constants";
import { CopyField } from "./copy-field";

interface ApiKeyRevealProps {
  credential: ClientCredentialCreateResponseDto;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}

/**
 * The one-time view of a new or rotated key. The secret is never shown again,
 * so the drawer around it stays open until `saved` (copied or ticked).
 */
export const ApiKeyReveal = ({
  credential,
  saved,
  onSavedChange,
}: ApiKeyRevealProps) => {
  const { t } = useTranslation();
  // The value a client sends as the x-api-key header.
  const apiKey = `${credential.key}:${credential.secret}`;

  return (
    <div className="flex flex-col gap-y-4">
      <Badge size="small" color="orange" className="self-start">
        {t("settings.clientCredentials.reveal.warning")}
      </Badge>
      <CopyField
        label={t("settings.clientCredentials.reveal.keyLabel")}
        value={apiKey}
        onCopied={() => onSavedChange(true)}
      />
      <div className="flex flex-col gap-y-1">
        <CopyField
          label={t("settings.clientCredentials.reveal.config")}
          value={mcpConfigSnippet(apiKey)}
          block
          onCopied={() => onSavedChange(true)}
        />
        <Text size="small" className="text-ui-fg-subtle">
          {t("settings.clientCredentials.reveal.configHint")}
        </Text>
      </div>
      <div className="flex items-center gap-x-2">
        <Checkbox
          id="api-key-saved"
          checked={saved}
          onCheckedChange={(checked) => onSavedChange(checked === true)}
        />
        <Label htmlFor="api-key-saved" size="small">
          {t("settings.clientCredentials.reveal.saved")}
        </Label>
      </div>
    </div>
  );
};
