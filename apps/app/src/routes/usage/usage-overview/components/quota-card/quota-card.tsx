import type { TokenUsageSummary } from "@/hooks/api/token-usage";
import { Badge, Container, Heading, Text } from "@medusajs/ui";
import { Meter } from "@repo/ui/components";
import { useTranslation } from "react-i18next";

/** Colour ramp for the meter — the last fifth warns, a spent quota is red. */
function toneFor(usedPercent: number) {
  if (usedPercent >= 100) return "danger" as const;
  if (usedPercent >= 80) return "warning" as const;
  return "normal" as const;
}

const STATUS_COLOR: Record<string, "green" | "orange" | "red" | "grey"> = {
  ACTIVE: "green",
  TRIALING: "orange",
  PAST_DUE: "red",
  CANCELED: "grey",
  EXPIRED: "grey",
};

/**
 * The headline gauge: how much of this period's quota is gone, plus which plan
 * that quota comes from.
 *
 * A percentage on purpose — the API withholds absolute token counts outside
 * development, so there is no number to show here even if we wanted one.
 */
export function QuotaCard({ summary }: { summary: TokenUsageSummary }) {
  const { t, i18n } = useTranslation();
  const { usedPercent } = summary;

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
        <div>
          <Text size="small" className="text-ui-fg-subtle">
            {t("usage.quota.plan")}
          </Text>
          <div className="mt-1 flex items-center gap-x-2">
            <Heading level="h2">{summary.planName || "—"}</Heading>
            <Badge
              size="2xsmall"
              color={STATUS_COLOR[summary.status] ?? "grey"}
            >
              {t(`usage.status.${summary.status}`, summary.status)}
            </Badge>
          </div>
        </div>

        <div className="text-right">
          <Text size="small" className="text-ui-fg-subtle">
            {t("usage.quota.renewsOn")}
          </Text>
          <Text size="small" className="tabular-nums">
            {new Date(summary.periodEnd).toLocaleDateString(i18n.language)}
          </Text>
        </div>
      </div>

      <div className="space-y-3 px-6 py-4">
        <Meter value={usedPercent} max={100} format={{ style: "percent" }}>
          <div className="flex items-baseline justify-between">
            <Meter.Label>{t("usage.quota.title")}</Meter.Label>
            {/* Base UI formats against max=100 as a fraction, so hand it the
                ratio rather than the whole number. */}
            <Meter.Value className="txt-compact-large-plus text-ui-fg-base">
              {() => `${usedPercent}%`}
            </Meter.Value>
          </div>
          <Meter.Track>
            <Meter.Indicator tone={toneFor(usedPercent)} />
          </Meter.Track>
        </Meter>

        <div className="flex flex-wrap items-center gap-2">
          <Badge size="2xsmall" color={summary.hasCredit ? "green" : "grey"}>
            {summary.hasCredit
              ? t("usage.quota.hasCredit")
              : t("usage.quota.noCredit")}
          </Badge>
          {usedPercent >= 100 && (
            <Text size="small" className="text-ui-fg-error">
              {t("usage.quota.exhausted")}
            </Text>
          )}
        </div>
      </div>
    </Container>
  );
}
