import type { TrackedLinkDetailResponseDto } from "@/hooks/api/tracked-links";
import { useDate } from "@/hooks/use-date";
import { Text, clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { closeRatePercent, formatRate } from "../utils";

type SourceStatsSectionProps = {
  source: TrackedLinkDetailResponseDto;
};

/** The four counts on a source's page, its QR and KOL codes included. */
export const SourceStatsSection: FC<SourceStatsSectionProps> = ({ source }) => {
  const { t, i18n } = useTranslation();
  const { getFullDate } = useDate();
  const stats = source.stats ?? {
    newCustomers: 0,
    potentialCustomers: 0,
    orders: 0,
  };
  const number = new Intl.NumberFormat(i18n.language);
  const rate = closeRatePercent(stats);

  return (
    <div className="grid grid-cols-2 border-t lg:grid-cols-4">
      <Stat
        label={t("customerSources.stats.newCustomers")}
        value={number.format(stats.newCustomers)}
        hint={t("customerSources.stats.since", {
          date: getFullDate(new Date(source.createdAt)),
        })}
      />
      <Stat
        className="border-l"
        label={t("customerSources.stats.potentialCustomers")}
        value={number.format(stats.potentialCustomers)}
        hint={t("customerSources.stats.potentialHint")}
      />
      <Stat
        className="border-t lg:border-l lg:border-t-0"
        label={t("customerSources.stats.orders")}
        value={number.format(stats.orders)}
        hint={t("customerSources.stats.ordersHint")}
      />
      <Stat
        className="border-l border-t lg:border-t-0"
        label={t("customerSources.columns.closeRate")}
        value={rate === null ? "–" : formatRate(rate, i18n.language)}
        hint={t("customerSources.stats.closeRateHint")}
      />
    </div>
  );
};

// Two per row on small screens and four from lg; each cell draws its own
// borders, since divide-x would leave a stray line on the wrapped row.
const Stat: FC<{
  label: string;
  value: ReactNode;
  hint: string;
  className?: string;
}> = ({ label, value, hint, className }) => (
  <div className={clx("flex min-w-0 flex-col gap-y-1 px-6 py-4", className)}>
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="xlarge" weight="plus" className="tabular-nums">
      {value}
    </Text>
    <Text size="xsmall" className="text-ui-fg-muted">
      {hint}
    </Text>
  </div>
);
