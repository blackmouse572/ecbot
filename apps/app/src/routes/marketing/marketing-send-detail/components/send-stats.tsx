import type { MarketingSendGetResponseDto } from "@/hooks/api/marketing-sends";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { formatMoney } from "@/routes/orders/utils";
import { StatCard } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type SendStatsProps = { send: MarketingSendGetResponseDto };

/** Đã gửi, Khách trả lời, Đặt đơn and Dừng nhận tin for one send. */
export const SendStats: FC<SendStatsProps> = ({ send }) => {
  const { t, i18n } = useTranslation();
  const f = useAnalyticsFormat();
  const { stats } = send;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label={t("marketing.sends.stats.sent")}
        current={stats.sent}
        format={f.number}
        hint={
          stats.queued > 0 &&
          t("marketing.sends.stats.queued", { value: f.number(stats.queued) })
        }
      />
      <StatCard
        label={t("marketing.sends.stats.replied")}
        current={stats.replied}
        format={(value) => f.share(value, stats.sent)}
        hint={t("marketing.sends.stats.repliedHint", {
          value: f.number(stats.replied),
        })}
      />
      <StatCard
        label={t("marketing.sends.stats.ordered")}
        current={stats.ordered}
        format={f.number}
        hint={t("marketing.sends.stats.revenue", {
          // VND has no minor unit, so minor units are đồng.
          value: formatMoney(stats.revenue, "VND", i18n.language),
        })}
      />
      <StatCard
        label={t("marketing.sends.stats.optedOut")}
        current={stats.optedOut}
        format={f.number}
        hint={f.share(stats.optedOut, stats.sent)}
      />
    </div>
  );
};
