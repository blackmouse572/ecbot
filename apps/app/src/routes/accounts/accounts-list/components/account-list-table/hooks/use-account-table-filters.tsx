import type { Filter } from "@/components/table/data-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type SelectFilter = Extract<Filter, { type: "select" }>;

/** Pairs each API value with the label its chip shows. */
const toOptions = (entries: [string, string][]) =>
  entries.map(([value, label]) => ({ value, label }));

/** Both accounts facets are single-choice, searchable selects. */
const facet = (
  key: string,
  label: string,
  entries: [string, string][],
): SelectFilter => ({
  key,
  label,
  type: "select",
  multiple: false,
  searchable: true,
  options: toOptions(entries),
});

/** Status and channel-type facets above the accounts table. */
export const useAccountTableFilters = (): Filter[] => {
  const { t } = useTranslation();

  return useMemo<Filter[]>(
    () => [
      facet("status", t("fields.status"), [
        ["ACTIVE", t("accounts.details.statuses.active.label")],
        ["INACTIVE", t("accounts.details.statuses.inactive.label")],
        ["BLOCKED", t("accounts.details.statuses.blocked.label")],
      ]),
      facet("type", t("fields.type"), [
        ["FACEBOOK_ACCOUNT", t("accounts.details.types.facebookAccount.label")],
        ["FACEBOOK_PAGE", t("accounts.details.types.facebookPage.label")],
        [
          "INSTAGRAM_ACCOUNT",
          t("accounts.details.types.instagramAccount.label"),
        ],
        ["INSTAGRAM_PAGE", t("accounts.details.types.instagramPage.label")],
        ["ZALO_ACCOUNT", t("accounts.details.types.zaloAccount.label")],
        ["ZALO_PAGE", t("accounts.details.types.zaloPage.label")],
        ["TIKTOK_SHOP", t("accounts.details.types.tiktokShop.label")],
        ["SHOPEE_SHOP", t("accounts.details.types.shopeeShop.label")],
        ["TELEGRAM_BOT", t("accounts.details.types.telegramBot.label")],
        ["API_CHANNEL", t("accounts.details.types.apiChannel.label")],
        ["WEBSITE_WIDGET", t("accounts.details.types.websiteWidget.label")],
        [
          "WHATSAPP_BUSINESS",
          t("accounts.details.types.whatsappBusiness.label"),
        ],
      ]),
    ],
    [t],
  );
};
