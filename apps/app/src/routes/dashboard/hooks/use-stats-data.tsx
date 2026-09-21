import {
  IconCardboardsFilled,
  IconLayoutBottombarFilled,
  IconUserFilled,
} from "@tabler/icons-react";
import type { StatsItemProps } from "../components/stats-item";

export function useStatsData(): StatsItemProps[] {
  return [
    {
      icon: <IconCardboardsFilled className="size-4" />,
      label: "Active Chatbots",
      value: 47,
      trend: { value: "12%", isPositive: true },
    },
    {
      icon: <IconLayoutBottombarFilled className="size-4" />,
      label: "Monthly Messages",
      value: "18,432",
      trend: { value: "8.3%", isPositive: true },
    },
    {
      icon: <IconUserFilled className="size-4" />,
      label: "Connected Accounts",
      value: 23,
      trend: { value: "15%", isPositive: true },
    },
  ];
}
