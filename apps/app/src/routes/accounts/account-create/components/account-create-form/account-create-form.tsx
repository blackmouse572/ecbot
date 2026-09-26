import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useLinkAccount } from "@/hooks/api";
import {
  Avatar,
  Button,
  Checkbox,
  Container,
  Divider,
  Heading,
  Input,
  ProgressTabs,
  type ProgressStatus,
  StatusBadge,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import { useState } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useOAuthLogin } from "../../hook/use-oauth-login";
import { IssuedPanel, ProvisionStep } from "./provision-step";
import { isProvisionedPlatform, type Issued } from "./provisioned-platforms";
import { WhatsAppCredentialFields } from "./whatsapp-credential-fields";

// ─── Step definitions ────────────────────────────────────────────────────────

const TAB = {
  PLATFORM: "PLATFORM",
  CONNECT: "CONNECT",
  SUCCESS: "SUCCESS",
} as const;

type TabKey = keyof typeof TAB;
type TabState = Record<TabKey, ProgressStatus>;

const initialTabState: TabState = {
  PLATFORM: "in-progress",
  CONNECT: "not-started",
  SUCCESS: "not-started",
};

// ─── Platform config ──────────────────────────────────────────────────────────

type PlatformMeta = {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Declared in ENUM_ACCOUNT_TYPE but the adapter is not implemented yet. */
  comingSoon?: boolean;
};

const PLATFORMS: PlatformMeta[] = [
  {
    value: "FACEBOOK_ACCOUNT",
    label: "Facebook",
    description: "Pages & Messenger",
    icon: (
      <img
        src="/icons/facebook-messenger.svg"
        alt="Facebook"
        className="size-8"
      />
    ),
  },
  {
    value: "INSTAGRAM_ACCOUNT",
    label: "Instagram",
    description: "Business accounts",
    icon: <img src="/icons/instagram.svg" alt="Instagram" className="size-8" />,
    comingSoon: true,
  },
  {
    value: "ZALO_ACCOUNT",
    label: "Zalo",
    description: "Zalo OA",
    icon: <img src="/icons/zalo.svg" alt="Zalo" className="size-8" />,
  },
  {
    value: "TIKTOK_SHOP",
    label: "TikTok Shop",
    description: "Shop & seller center",
    icon: <img src="/icons/tiktok.svg" alt="TikTok" className="size-8" />,
    comingSoon: true,
  },
  {
    value: "SHOPEE_SHOP",
    label: "Shopee",
    description: "Shopee seller",
    icon: <img src="/icons/shopee.svg" alt="Shopee" className="size-8" />,
    comingSoon: true,
  },
  {
    value: "TELEGRAM_BOT",
    label: "Telegram",
    description: "Telegram bot",
    icon: <img src="/icons/telegram.svg" alt="Telegram" className="size-8" />,
  },
  {
    value: "WHATSAPP_BUSINESS",
    label: "WhatsApp",
    description: "WhatsApp Business (Cloud API)",
    icon: <img src="/icons/whatsapp.svg" alt="WhatsApp" className="size-8" />,
  },
  {
    value: "WEBSITE_WIDGET",
    label: "Website",
    description: "Embeddable chat widget",
    icon: (
      <img src="/icons/website-widget.svg" alt="Website" className="size-8" />
    ),
  },
  {
    value: "API_CHANNEL",
    label: "API",
    description: "Direct REST integration",
    icon: <img src="/icons/api-channel.svg" alt="API" className="size-8" />,
  },
];

type AccountLinkFormValues = {
  platform: string | null;
  acceptedTerms: boolean;
  botToken: string;
  phoneNumberId: string;
  accessToken: string;
};

export const AccountCreateForm = () => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm<AccountLinkFormValues>({
    defaultValues: {
      platform: null,
      acceptedTerms: false,
      botToken: "",
      phoneNumberId: "",
      accessToken: "",
    },
    mode: "onChange",
  });

  const [tab, setTab] = useState<TabKey>("PLATFORM");
  const [tabState, setTabState] = useState<TabState>(initialTabState);
  const [linkedData, setLinkedData] = useState<
    | (AccountGetDetailResponseDto & { pages: AccountGetDetailResponseDto[] })
    | null
  >(null);
  // The eccho-issued channels produce a credential rather than a linked
  // account, so they fill the last step with this instead of `linkedData`.
  const [issued, setIssued] = useState<Issued | null>(null);

  const { mutateAsync, isPending } = useLinkAccount();

  const selectedPlatform = form.watch("platform");

  const goToTab = (next: TabKey, completeCurrent: TabKey) => {
    setTabState((prev) => ({
      ...prev,
      [completeCurrent]: "completed",
      [next]: "in-progress",
    }));
    setTab(next);
  };

  const handlePlatformSelect = (value: string) => {
    form.setValue("platform", value);
    form.setValue("acceptedTerms", false);
    goToTab("CONNECT", "PLATFORM");
  };

  const handleBack = () => {
    form.setValue("acceptedTerms", false);
    form.setValue("botToken", "");
    form.setValue("phoneNumberId", "");
    form.setValue("accessToken", "");
    setIssued(null);
    setTabState((prev) => ({
      ...prev,
      PLATFORM: "in-progress",
      CONNECT: "not-started",
    }));
    setTab("PLATFORM");
  };

  const handleIssued = (result: Issued) => {
    setIssued(result);
    goToTab("SUCCESS", "CONNECT");
  };

  const handleOAuthSuccess = async ({ code }: { code: string }) => {
    if (!selectedPlatform) return;
    try {
      const res = await mutateAsync({ code, platform: selectedPlatform as A });
      setLinkedData((res.data as A)?.data ?? null);
      goToTab("SUCCESS", "CONNECT");
    } catch (error) {
      console.error("Failed to link account:", error);
      const message =
        (error as A)?.body?.message ?? (error as A)?.message ?? "";
      toast.error(t("accounts.link.error", { error: message }));
    }
  };

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm className="flex h-full flex-col">
        <ProgressTabs
          value={tab}
          className="flex h-full flex-col overflow-hidden"
        >
          <RouteFocusModal.Header>
            <div className="-my-2 w-full border-l">
              <ProgressTabs.List>
                <ProgressTabs.Trigger
                  value={TAB.PLATFORM}
                  status={tabState.PLATFORM}
                >
                  {t("accounts.create.steps.platform")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  value={TAB.CONNECT}
                  status={tabState.CONNECT}
                >
                  {t("accounts.create.steps.connect")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  value={TAB.SUCCESS}
                  status={tabState.SUCCESS}
                >
                  {t("accounts.create.steps.success")}
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </div>
          </RouteFocusModal.Header>

          <RouteFocusModal.Body className="flex flex-col items-center p-16">
            <ProgressTabs.Content
              value={TAB.PLATFORM}
              className="w-full flex justify-center"
            >
              <PlatformStep onSelect={handlePlatformSelect} />
            </ProgressTabs.Content>

            <ProgressTabs.Content
              value={TAB.CONNECT}
              className="w-full flex justify-center"
            >
              {selectedPlatform &&
                (isProvisionedPlatform(selectedPlatform) ? (
                  // eccho issues these credentials itself, so there is no code
                  // to exchange and no generic success step to hand off to —
                  // the secret is shown once, right here.
                  <ProvisionStep
                    platform={selectedPlatform}
                    onBack={handleBack}
                    onIssued={handleIssued}
                  />
                ) : (
                  <ConnectStep
                    platform={selectedPlatform}
                    isPending={isPending}
                    onBack={handleBack}
                    onOAuthSuccess={handleOAuthSuccess}
                  />
                ))}
            </ProgressTabs.Content>

            <ProgressTabs.Content
              value={TAB.SUCCESS}
              className="w-full flex justify-center"
            >
              {issued ? (
                <IssuedPanel issued={issued} onDone={() => handleSuccess?.()} />
              ) : (
                linkedData && (
                  <SuccessStep
                    data={linkedData}
                    onDone={() => handleSuccess?.()}
                  />
                )
              )}
            </ProgressTabs.Content>
          </RouteFocusModal.Body>
        </ProgressTabs>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};

function PlatformStep({ onSelect }: { onSelect: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>{t("accounts.create.platform.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("accounts.create.platform.description")}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            disabled={p.comingSoon}
            onClick={() => onSelect(p.value)}
            className={
              p.comingSoon
                ? "flex cursor-not-allowed items-center gap-x-3 rounded-lg border border-ui-border-base bg-ui-bg-disabled p-4 text-left opacity-60"
                : "flex items-center gap-x-3 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 text-left transition-colors hover:bg-ui-bg-base-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive"
            }
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle">
              {p.icon}
            </div>
            <div>
              <div className="flex items-center gap-x-2">
                <Text size="small" weight="plus">
                  {p.label}
                </Text>
                {p.comingSoon && (
                  <StatusBadge color="grey">
                    {t("accounts.create.platform.roadmap")}
                  </StatusBadge>
                )}
              </div>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {p.description}
              </Text>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type WhatsAppTab = "oauth" | "manual";

function AcceptTermsField() {
  const { t } = useTranslation();
  const form = useFormContext<AccountLinkFormValues>();
  return (
    <Form.Field
      name="acceptedTerms"
      control={form.control}
      render={({ field }) => (
        <Form.Item className="flex-row items-center gap-x-2">
          <Form.Control>
            <Checkbox
              {...field}
              value={field.value.toString()}
              checked={field.value}
              onCheckedChange={field.onChange}
              className="mb-0"
            />
          </Form.Control>
          <Form.Label>{t("accounts.link.acceptTerms")}</Form.Label>
          <Form.ErrorMessage />
        </Form.Item>
      )}
    />
  );
}

function ConnectStep({
  platform,
  isPending,
  onBack,
  onOAuthSuccess,
}: {
  platform: string;
  isPending: boolean;
  onBack: () => void;
  onOAuthSuccess: (data: { code: string }) => void;
}) {
  const { t } = useTranslation();
  const form = useFormContext<AccountLinkFormValues>();
  const acceptedTerms = useWatch({
    control: form.control,
    name: "acceptedTerms",
  });

  const meta = PLATFORMS.find((p) => p.value === platform);
  const isTelegram = platform === "TELEGRAM_BOT";
  const isWhatsApp = platform === "WHATSAPP_BUSINESS";
  // WhatsApp connects through Meta's signup popup; pasting credentials is a fallback.
  const [whatsAppTab, setWhatsAppTab] = useState<WhatsAppTab>("oauth");
  // Platforms linked by pasting a credential instead of an OAuth popup.
  const manualKey = isTelegram
    ? "telegram"
    : isWhatsApp && whatsAppTab === "manual"
      ? "whatsapp"
      : null;

  const { handleLinkClick } = useOAuthLogin(platform, {
    onSuccess: onOAuthSuccess,
    onError: (err) => toast.error(t("accounts.link.error", { error: err })),
  });

  const handleManualConnect = form.handleSubmit((values) => {
    onOAuthSuccess({
      // The link endpoint takes one `code`; Meta tokens contain no `:`.
      code: isWhatsApp
        ? `${values.phoneNumberId.trim()}:${values.accessToken.trim()}`
        : values.botToken.trim(),
    });
  });

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div className="flex items-center gap-x-3">
        {meta && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle">
            {meta.icon}
          </div>
        )}
        <div>
          <Heading>
            {t("accounts.create.connect.title", { platform: meta?.label })}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {manualKey
              ? t(`accounts.create.connect.${manualKey}.description`)
              : t("accounts.create.connect.description")}
          </Text>
        </div>
      </div>

      <div className="flex w-full flex-col gap-y-4">
        {isTelegram ? (
          <Form.Field
            name="botToken"
            control={form.control}
            rules={{
              required: t("accounts.create.connect.telegram.tokenLabel"),
              pattern: {
                value: /^\d+:[A-Za-z0-9_-]{35,}$/,
                message: t("accounts.create.connect.telegram.tokenInvalid"),
              },
            }}
            render={({ field }) => (
              <Form.Item className="flex flex-col gap-y-2">
                <Form.Label>
                  {t("accounts.create.connect.telegram.tokenLabel")}
                </Form.Label>
                <Form.Control>
                  <Input
                    type="password"
                    placeholder={t(
                      "accounts.create.connect.telegram.tokenPlaceholder",
                    )}
                    autoComplete="off"
                    {...field}
                  />
                </Form.Control>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("accounts.create.connect.telegram.tokenHint")}
                </Text>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        ) : isWhatsApp ? (
          <Tabs
            value={whatsAppTab}
            onValueChange={(value) => setWhatsAppTab(value as WhatsAppTab)}
          >
            <Tabs.List>
              <Tabs.Trigger value="oauth">
                {t("accounts.create.connect.whatsapp.tabs.oauth")}
              </Tabs.Trigger>
              <Tabs.Trigger value="manual">
                {t("accounts.create.connect.whatsapp.tabs.manual")}
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="oauth" className="pt-4">
              <AcceptTermsField />
            </Tabs.Content>
            <Tabs.Content value="manual" className="flex flex-col gap-y-4 pt-4">
              <WhatsAppCredentialFields />
            </Tabs.Content>
          </Tabs>
        ) : (
          <AcceptTermsField />
        )}

        <div className="flex gap-x-2">
          <Button type="button" variant="secondary" onClick={onBack}>
            {t("actions.back")}
          </Button>
          {manualKey ? (
            <Button
              type="button"
              onClick={handleManualConnect}
              disabled={!form.formState.isValid}
              isLoading={isPending}
            >
              {t(`accounts.create.connect.${manualKey}.cta`)}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleLinkClick}
              disabled={!acceptedTerms}
              isLoading={isPending}
            >
              {t("accounts.create.connect.cta", { platform: meta?.label })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStep({
  data,
  onDone,
}: {
  data: AccountGetDetailResponseDto & { pages: AccountGetDetailResponseDto[] };
  onDone: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Heading>{t("accounts.link.success.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("accounts.link.success.description")}
          </Text>
        </div>
        <Button variant="secondary" onClick={onDone}>
          {t("actions.continued")}
        </Button>
      </div>

      <div className="space-y-4">
        <Container className="flex gap-4 items-center">
          <Avatar
            src={data.avatar}
            size="large"
            fallback={getAvatarFallback(data.name)}
          />
          <div className="flex flex-col justify-center flex-1">
            <Text size="base">{data.name}</Text>
            <div className="[&>*]:px-4 divide-x flex [&>*]:first:pl-0">
              <Text size="small" className="text-ui-fg-subtle">
                {data.slug}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                {data.type}
              </Text>
            </div>
          </div>
          <StatusBadge color="green" className="h-fit">
            {t("accounts.details.statuses.active.title")}
          </StatusBadge>
        </Container>

        {data.pages?.length > 0 && (
          <>
            <Divider variant="dashed" />
            {data.pages.map((page) => (
              <Container key={page.id} className="flex gap-4 items-center">
                <Avatar
                  src={page.avatar}
                  size="large"
                  fallback={getAvatarFallback(page.name)}
                />
                <div className="flex flex-col justify-center flex-1">
                  <Text size="base">{page.name}</Text>
                  <div className="[&>*]:px-4 divide-x flex [&>*]:first:pl-0">
                    <Text size="small" className="text-ui-fg-subtle">
                      {page.slug}
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {page.type}
                    </Text>
                  </div>
                </div>
                <StatusBadge color="green" className="h-fit">
                  {t("accounts.details.statuses.active.title")}
                </StatusBadge>
              </Container>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
