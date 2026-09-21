import type { TokenUsageSummary } from "@/hooks/api/token-usage";
import { Badge, Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

/**
 * Absolute token counts, for development.
 *
 * Rendered only when the API actually sent them — it omits `debug` in
 * production. Guarding on the payload rather than on `import.meta.env.DEV`
 * keeps one source of truth: if the server withheld the numbers there is
 * nothing to render, and if it sent them a production-built staging app can
 * still show them.
 */
export function TokenDebugPanel({ summary }: { summary: TokenUsageSummary }) {
  const { t } = useTranslation();
  if (!summary.debug) return null;

  const { tokenQuota, tokenUsedInPeriod, tokenCreditBalance } = summary.debug;

  return (
    <Container className="space-y-3 border-dashed">
      <div className="flex items-center gap-2">
        <Heading level="h2">{t("usage.debug.title")}</Heading>
        <Badge size="2xsmall" color="orange">
          dev
        </Badge>
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        {t("usage.debug.description")}
      </Text>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          [t("usage.debug.quota"), tokenQuota],
          [t("usage.debug.used"), tokenUsedInPeriod],
          [t("usage.debug.credit"), tokenCreditBalance],
        ].map(([label, value]) => (
          <div key={label as string}>
            <dt className="text-ui-fg-muted text-xs">{label}</dt>
            <dd className="tabular-nums text-lg font-medium">
              {(value as number).toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
