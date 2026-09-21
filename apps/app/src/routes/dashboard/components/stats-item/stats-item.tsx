import { Heading, Text } from "@medusajs/ui";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface StatsItemProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export function StatsItem({ icon, label, value, trend }: StatsItemProps) {
  return (
    <div className="space-y-3 sm:space-y-4 px-4 sm:px-6 py-4 first:pl-4 last:pr-4">
      <div className="flex gap-2 text-ui-fg-muted items-center">
        {icon}
        <Text className="txt-medium-plus text-sm sm:text-base">{label}</Text>
      </div>
      <div className="flex items-end gap-2 sm:gap-2 lg:gap-4">
        <Heading className="font-medium text-xl sm:text-2xl lg:text-3xl">
          {value}
        </Heading>
        {trend && (
          <div className="flex items-center gap-1 sm:gap-2">
            {trend.isPositive !== false ? (
              <IconTrendingUp className="size-3 sm:size-4 text-ui-tag-green-icon" />
            ) : (
              <IconTrendingDown className="size-3 sm:size-4 text-ui-tag-red-icon" />
            )}
            <span
              className={`text-xs sm:text-sm ${
                trend.isPositive !== false
                  ? "text-ui-tag-green-text"
                  : "text-ui-tag-red-text"
              }`}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
