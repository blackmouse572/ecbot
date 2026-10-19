import type { UsageAnalytics } from "@/hooks/api/workspace-analytics";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ArrowUpRightMini } from "@medusajs/icons";
import { Container, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAnalyticsFormat } from "./use-analytics-format";

/** Plan credits used this cycle, as a stat that opens the usage page. */
export const UsageStat: FC<{ data: UsageAnalytics }> = ({ data }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const { workspaceSlug } = useWorkspaceParams();
  const share = data.limit ? (data.used / data.limit) * 100 : 0;

  return (
    <Link
      to={`/${workspaceSlug}/usage`}
      className="group rounded-lg outline-none focus-visible:shadow-borders-focus"
    >
      <Container className="group-hover:bg-ui-bg-base-hover flex h-full flex-col gap-y-1 px-4 py-3">
        <Text
          size="small"
          className="text-ui-fg-subtle flex items-center justify-between"
        >
          {t("dashboard.analytics.usage.planTitle")}
          <ArrowUpRightMini className="text-ui-fg-muted" />
        </Text>
        <Text size="xlarge" weight="plus" className="tabular-nums">
          {f.percent(Math.round(share))}
        </Text>
        <div className="bg-ui-bg-subtle h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-ui-fg-interactive h-full rounded-full"
            style={{ width: `${Math.min(100, share)}%` }}
          />
        </div>
        <Text size="xsmall" className="text-ui-fg-muted tabular-nums">
          {t("dashboard.analytics.usage.usedOf", {
            used: f.compact(data.used),
            limit: f.compact(data.limit),
          })}
        </Text>
      </Container>
    </Link>
  );
};
