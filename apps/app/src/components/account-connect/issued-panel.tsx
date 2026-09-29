import { CopyField } from "@/routes/accounts/account-create/components/account-create-form/copy-field";
import { Alert, Button, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { Issued } from "./issued";

/**
 * The one-time view of an eccho-issued channel's credentials, shared by the
 * accounts create wizard's final step and the agent builder's website card.
 */
export function IssuedPanel({
  issued,
  onDone,
}: {
  issued: Issued;
  onDone: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-6">
      <div>
        <Heading>{t("accounts.create.provision.issuedTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {/* A widget key sits in the page source, so there is nothing to
              keep secret; only API channel credentials are shown once. */}
          {issued.kind === "API_CHANNEL"
            ? t("accounts.create.provision.issuedDescription")
            : t("accounts.create.provision.websiteWidget.issuedDescription")}
        </Text>
      </div>

      {issued.kind === "API_CHANNEL" ? (
        <>
          <Alert variant="warning">
            {t("accounts.create.provision.apiChannel.secretWarning")}
          </Alert>
          <CopyField
            label={t("accounts.create.provision.apiChannel.accountKeyLabel")}
            value={issued.accountKey}
            hint={t("accounts.create.provision.apiChannel.accountKeyHint")}
          />
          <CopyField
            label={t("accounts.create.provision.apiChannel.secretLabel")}
            value={issued.signingSecret}
            hint={t("accounts.create.provision.apiChannel.secretHint")}
          />
        </>
      ) : (
        <>
          <CopyField
            label={t("accounts.create.provision.websiteWidget.keyLabel")}
            value={issued.widgetKey}
          />
          <CopyField
            label={t("accounts.create.provision.websiteWidget.snippetLabel")}
            value={embedSnippet(issued.widgetKey)}
            hint={t("accounts.create.provision.websiteWidget.snippetHint")}
            multiline
          />
        </>
      )}

      <div>
        <Button type="button" onClick={onDone}>
          {t("actions.close")}
        </Button>
      </div>
    </div>
  );
}

function embedSnippet(widgetKey: string): string {
  return `<script src="${window.location.origin}/widget.js" data-widget-key="${widgetKey}" async></script>`;
}
