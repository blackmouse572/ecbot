import type { MarketingSendGetResponseDto } from "@/hooks/api/marketing-sends";
import { Container, Heading, Text } from "@medusajs/ui";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type SendNotSentSectionProps = { send: MarketingSendGetResponseDto };

/** Customers the send left out or could not reach, by reason. */
export const SendNotSentSection: FC<SendNotSentSectionProps> = ({ send }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const total = send.notSent.reduce((sum, row) => sum + row.count, 0);

  if (!total) return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-3 px-6 py-4">
        <Heading level="h2">{t("marketing.sends.notSent.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle tabular-nums">
          {t("marketing.sends.notSent.total", { value: f.number(total) })}
        </Text>
      </div>
      <ul className="flex flex-col gap-y-2 px-6 py-4">
        {send.notSent.map((row) => (
          <li
            key={row.reason}
            className="flex items-center justify-between gap-x-3"
          >
            {/* The reasons are written to finish a sentence, so lowercase. */}
            <Text
              size="small"
              className="text-ui-fg-subtle first-letter:uppercase"
            >
              {t(`marketing.exclusion.${row.reason}`)}
            </Text>
            <Text size="small" weight="plus" className="tabular-nums">
              {f.number(row.count)}
            </Text>
          </li>
        ))}
      </ul>
    </Container>
  );
};
