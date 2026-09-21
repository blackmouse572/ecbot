"use client";

import { Badge, Container, Heading } from "@medusajs/ui";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/components";
import { IconTrendingDown2 } from "@tabler/icons-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

const chartData = [
  { type: "Beauty", active: 28, inactive: 8 },
  { type: "E-commerce", active: 35, inactive: 12 },
  { type: "Restaurant", active: 22, inactive: 6 },
  { type: "Healthcare", active: 18, inactive: 4 },
  { type: "Fashion", active: 31, inactive: 9 },
  { type: "Finance", active: 15, inactive: 3 },
  { type: "Education", active: 12, inactive: 2 },
  { type: "Travel", active: 8, inactive: 1 },
  { type: "SPA", active: 14, inactive: 3 },
  { type: "Fitness", active: 10, inactive: 2 },
  { type: "Real Estate", active: 7, inactive: 1 },
  { type: "Other", active: 5, inactive: 1 },
];

const chartConfig = {
  active: {
    label: "Active Chatbots",
    color: "var(--chart-1)",
  },
  inactive: {
    label: "Inactive Chatbots",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function ChatbotRadialChat() {
  return (
    <Container>
      <div className="items-center pb-4">
        <Heading>
          Chatbot Distribution by Type
          <Badge size="xsmall">
            <IconTrendingDown2 className="h-4 w-4" />
            <span>2.1%</span>
          </Badge>
        </Heading>
      </div>
      <div className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="type" />
            <PolarGrid strokeDasharray="3 3" />
            <Radar
              stroke="var(--color-active)"
              dataKey="active"
              fill="none"
              filter="url(#multi-stroke-line-glow)"
            />
            <Radar
              stroke="var(--color-inactive)"
              dataKey="inactive"
              fill="none"
              filter="url(#multi-stroke-line-glow)"
            />
            <defs>
              <filter
                id="multi-stroke-line-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
          </RadarChart>
        </ChartContainer>
      </div>
    </Container>
  );
}
