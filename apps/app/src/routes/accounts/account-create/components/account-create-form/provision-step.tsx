import {
  useProvisionApiChannel,
  useProvisionWebsiteWidget,
} from "@/hooks/api/accounts";
import { Alert, Button, Heading, Input, Text, toast } from "@medusajs/ui";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CopyField } from "./copy-field";
// Kept in a separate module so this file exports only components — a mixed
// module breaks Fast Refresh.
import type {
  Issued,
  ProvisionedPlatform,
} from "./provisioned-platforms";
import { Form } from "@repo/ui/common-components";

type FormValues = {
  name: string;
  callbackUrl: string;
  allowedOrigins: string;
};

/**
 * Connect step for the eccho-issued channels.
 *
 * Kept out of `ConnectStep` because the direction is reversed: an OAuth channel
 * sends the operator to a third party and brings a `code` back, while these mint
 * a credential here and hand it to the operator. The API channel's signing
 * secret in particular is shown once and is never recoverable, so this step owns
 * the result panel rather than handing off to the wizard's generic success view.
 */
export function ProvisionStep({
  platform,
  onBack,
  onIssued,
}: {
  platform: ProvisionedPlatform;
  onBack: () => void;
  /** Hands the minted credential to the wizard, which advances to the last step. */
  onIssued: (issued: Issued) => void;
}) {
  const { t } = useTranslation();

  const provisionApiChannel = useProvisionApiChannel();
  const provisionWidget = useProvisionWebsiteWidget();

  const isApiChannel = platform === "API_CHANNEL";
  const isPending = isApiChannel
    ? provisionApiChannel.isPending
    : provisionWidget.isPending;

  const form = useForm<FormValues>({
    defaultValues: { name: "", callbackUrl: "", allowedOrigins: "" },
    mode: "onChange",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isApiChannel) {
        const res = await provisionApiChannel.mutateAsync({
          name: values.name.trim(),
          callbackUrl: values.callbackUrl.trim(),
        });
        onIssued({
          kind: "API_CHANNEL",
          accountKey: res.accountKey,
          signingSecret: res.signingSecret,
        });
      } else {
        const res = await provisionWidget.mutateAsync({
          name: values.name.trim(),
          allowedOrigins: splitOrigins(values.allowedOrigins),
        });
        onIssued({ kind: "WEBSITE_WIDGET", widgetKey: res.widgetKey });
      }
    } catch (error) {
      const message =
        (error as { body?: { message?: string }; message?: string })?.body
          ?.message ??
        (error as { message?: string })?.message ??
        "";
      toast.error(t("accounts.link.error", { error: message }));
    }
  });

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>
          {t(
            isApiChannel
              ? "accounts.create.provision.apiChannel.title"
              : "accounts.create.provision.websiteWidget.title",
          )}
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t(
            isApiChannel
              ? "accounts.create.provision.apiChannel.description"
              : "accounts.create.provision.websiteWidget.description",
          )}
        </Text>
      </div>

      <Form {...form}>
        <div className="flex w-full flex-col gap-y-4">
          <Form.Field
            name="name"
            control={form.control}
            rules={{ required: t("accounts.create.provision.nameLabel") }}
            render={({ field }) => (
              <Form.Item className="flex flex-col gap-y-2">
                <Form.Label>
                  {t("accounts.create.provision.nameLabel")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("accounts.create.provision.namePlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          {isApiChannel ? (
            <Form.Field
              name="callbackUrl"
              control={form.control}
              rules={{
                required: t(
                  "accounts.create.provision.apiChannel.callbackLabel",
                ),
                pattern: {
                  // HTTPS only — the callback carries conversation content and
                  // the signature is worthless over a readable channel.
                  value: /^https:\/\/.+/i,
                  message: t(
                    "accounts.create.provision.apiChannel.callbackInvalid",
                  ),
                },
              }}
              render={({ field }) => (
                <Form.Item className="flex flex-col gap-y-2">
                  <Form.Label>
                    {t("accounts.create.provision.apiChannel.callbackLabel")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      placeholder="https://your-app.example.com/eccho/replies"
                      autoComplete="off"
                      {...field}
                    />
                  </Form.Control>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("accounts.create.provision.apiChannel.callbackHint")}
                  </Text>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          ) : (
            <Form.Field
              name="allowedOrigins"
              control={form.control}
              rules={{
                required: t(
                  "accounts.create.provision.websiteWidget.originsLabel",
                ),
                validate: (value: string) =>
                  splitOrigins(value).every(isHttpUrl) ||
                  t("accounts.create.provision.websiteWidget.originsInvalid"),
              }}
              render={({ field }) => (
                <Form.Item className="flex flex-col gap-y-2">
                  <Form.Label>
                    {t("accounts.create.provision.websiteWidget.originsLabel")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      placeholder="https://shop.example.com, https://www.example.com"
                      autoComplete="off"
                      {...field}
                    />
                  </Form.Control>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("accounts.create.provision.websiteWidget.originsHint")}
                  </Text>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}

          <div className="flex gap-x-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              {t("actions.back")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!form.formState.isValid}
              isLoading={isPending}
            >
              {t("accounts.create.provision.cta")}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}

/** The wizard's final step for an eccho-issued channel. */
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
          {t("accounts.create.provision.issuedDescription")}
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

function splitOrigins(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}
