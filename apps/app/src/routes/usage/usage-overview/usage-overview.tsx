import {
  useExportTokenUsage,
  useTokenUsageByChatbot,
  useTokenUsageByPlatform,
  useTokenUsageSummary,
  useTokenUsageTrend,
  type TokenUsageBreakdownRow,
} from "@/hooks/api/token-usage";
import { Button, Heading, Text } from "@medusajs/ui";
import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
  LowBalanceSettings,
  QuotaCard,
  QuotaCardSkeleton,
  TokenDebugPanel,
  UsageBreakdownTable,
  UsageTrendChart,
} from "./components";

/** ENUM_ACCOUNT_TYPE -> the i18n key the accounts screens already use. */
const PLATFORM_I18N_KEY: Record<string, string> = {
  FACEBOOK_ACCOUNT: "facebookAccount",
  FACEBOOK_PAGE: "facebookPage",
  INSTAGRAM_ACCOUNT: "instagramAccount",
  INSTAGRAM_PAGE: "instagramPage",
  ZALO_ACCOUNT: "zaloAccount",
  ZALO_PAGE: "zaloPage",
  TIKTOK_SHOP: "tiktokShop",
  SHOPEE_SHOP: "shopeeShop",
  TELEGRAM_BOT: "telegramBot",
  API_CHANNEL: "apiChannel",
  WEBSITE_WIDGET: "websiteWidget",
};

export function UsageOverview() {
  const { t } = useTranslation();
  const { summary, isLoading } = useTokenUsageSummary();
  const { points, isLoading: trendLoading } = useTokenUsageTrend();
  const { rows: byChatbot, isLoading: chatbotLoading } =
    useTokenUsageByChatbot();
  const { rows: byPlatform, isLoading: platformLoading } =
    useTokenUsageByPlatform();
  const { mutate: exportCsv, isPending: isExporting } = useExportTokenUsage();

  /**
   * The API falls back to the usage `source` when a row has no platform, so
   * preview traffic arrives as "PREVIEW" rather than a blank. Anything that is
   * neither a known platform nor a known source is shown raw — better an
   * unfamiliar code than a wrong label.
   */
  const platformLabel = (row: TokenUsageBreakdownRow) => {
    if (!row.id) return t("usage.byPlatform.preview");
    if (row.id === "PREVIEW") return t("usage.byPlatform.preview");
    const key = PLATFORM_I18N_KEY[row.id];
    return key ? t(`accounts.details.types.${key}.label`) : row.id;
  };

  return (
    <SingleColumnPage>
      <Helmet>
        <title>{t("usage.title")} - Ecbot</title>
      </Helmet>

      <div className="flex flex-col gap-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading>{t("usage.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("usage.subtitle")}
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <LowBalanceSettings threshold={summary?.lowBalanceThreshold} />
            <Button
              variant="secondary"
              size="small"
              isLoading={isExporting}
              disabled={isLoading}
              onClick={() => exportCsv(undefined)}
            >
              {t("usage.export")}
            </Button>
          </div>
        </div>

        {isLoading || !summary ? (
          <QuotaCardSkeleton />
        ) : (
          <QuotaCard summary={summary} />
        )}

        <UsageTrendChart points={points} isLoading={trendLoading} />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <UsageBreakdownTable
            title={t("usage.byChatbot.title")}
            labelColumn={t("usage.byChatbot.column")}
            rows={byChatbot}
            isLoading={chatbotLoading}
          />
          <UsageBreakdownTable
            title={t("usage.byPlatform.title")}
            labelColumn={t("usage.byPlatform.column")}
            rows={byPlatform}
            isLoading={platformLoading}
            renderLabel={platformLabel}
          />
        </div>

        {summary && <TokenDebugPanel summary={summary} />}
      </div>
    </SingleColumnPage>
  );
}
