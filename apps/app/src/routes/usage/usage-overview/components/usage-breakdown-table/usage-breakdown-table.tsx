import type { TokenUsageBreakdownRow } from "@/hooks/api/token-usage";
import { Container, Heading, Table, Text } from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

interface UsageBreakdownTableProps {
  title: string;
  /** Header for the first column — "Chatbot", "Platform", … */
  labelColumn: string;
  rows: TokenUsageBreakdownRow[];
  isLoading?: boolean;
  /**
   * Turn a row into display text. Platform rows need it (raw enum codes, and a
   * null platform that really means "operator preview"); chatbot rows already
   * carry a human name and can fall through to `row.label`.
   */
  renderLabel?: (row: TokenUsageBreakdownRow) => string;
}

/**
 * Shares of the window's usage. `tokens` is only populated outside production,
 * so the column appears or disappears with the environment rather than showing
 * an empty cell.
 */
export function UsageBreakdownTable({
  title,
  labelColumn,
  rows,
  isLoading,
  renderLabel,
}: UsageBreakdownTableProps) {
  const { t } = useTranslation();
  const showTokens = rows.some((row) => row.tokens !== undefined);

  return (
    <Container className="flex h-full flex-col gap-y-4">
      <Heading level="h2">{title}</Heading>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle">
          {t("usage.trend.empty")}
        </Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{labelColumn}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                {t("usage.share")}
              </Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                {t("usage.messages")}
              </Table.HeaderCell>
              {showTokens && (
                <Table.HeaderCell className="text-right">
                  {t("usage.tokens")}
                </Table.HeaderCell>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id ?? row.label}>
                <Table.Cell>
                  {renderLabel ? renderLabel(row) : row.label}
                </Table.Cell>
                <Table.Cell className="text-right tabular-nums">
                  {row.sharePercent}%
                </Table.Cell>
                <Table.Cell className="text-right tabular-nums">
                  {row.messages}
                </Table.Cell>
                {showTokens && (
                  <Table.Cell className="text-right tabular-nums">
                    {row.tokens?.toLocaleString()}
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  );
}
