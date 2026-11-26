import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import type { MarketingSendGetResponseDto } from "@/hooks/api/marketing-sends";
import { Container, Heading, Table } from "@medusajs/ui";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type SendChannelsSectionProps = { send: MarketingSendGetResponseDto };

const COLUMNS = ["sent", "replied", "ordered", "optedOut"] as const;

/** Kết quả theo kênh: the send's counts on each channel it went out on. */
export const SendChannelsSection: FC<SendChannelsSectionProps> = ({ send }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();

  if (!send.channels.length) return null;

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("marketing.sends.channels.title")}</Heading>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("marketing.sends.channels.channel")}
              </Table.HeaderCell>
              {COLUMNS.map((column) => (
                <Table.HeaderCell key={column} className="text-right">
                  {t(`marketing.sends.channels.${column}`)}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {send.channels.map((row) => (
              <Table.Row key={row.channel}>
                <Table.Cell>
                  <span className="flex items-center gap-x-2 whitespace-nowrap">
                    <PlatformIcon type={row.channel} size={16} />
                    {channelOf(row.channel).label}
                  </span>
                </Table.Cell>
                {COLUMNS.map((column) => (
                  <Table.Cell key={column} className="text-right tabular-nums">
                    {f.number(row[column])}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  );
};
