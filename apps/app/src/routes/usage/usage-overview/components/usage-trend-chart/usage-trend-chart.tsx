import type { TokenUsageTrendPoint } from "@/hooks/api/token-usage";
import { Container, Heading, Text } from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/components";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export function UsageTrendChart({
  points,
  isLoading,
}: {
  points: TokenUsageTrendPoint[];
  isLoading?: boolean;
}) {
  const { t } = useTranslation();

  const chartConfig = {
    percentOfQuota: {
      label: t("usage.trend.percentOfQuota"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Container className="space-y-4">
      <Heading level="h2">{t("usage.trend.title")}</Heading>

      {isLoading ? (
        // Match the chart's height so the card doesn't resize when data lands.
        <Skeleton className="h-[240px] w-full rounded-lg" />
      ) : points.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle">
          {t("usage.trend.empty")}
        </Text>
      ) : (
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <AreaChart data={points} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              // Long ISO dates crowd the axis; the year is the same throughout.
              tickFormatter={(value: string) => value.slice(5)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(value: number) => `${value}%`}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="percentOfQuota"
              type="monotone"
              stroke="var(--color-percentOfQuota)"
              fill="var(--color-percentOfQuota)"
              fillOpacity={0.15}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </Container>
  );
}
