import { KB_STATUS_CONFIG } from "@/routes/knowledge-base/constants";
import { Badge, StatusBadge, Tooltip } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import { useDate } from "../../../../../hooks/use-date";

export function KnowledgeItemStatusCell({
  status,
  errorMessage,
  processedAt,
}: {
  status: KnowledgeItemResponseDto["status"];
  errorMessage?: KnowledgeItemResponseDto["errorMessage"];
  processedAt?: KnowledgeItemResponseDto["processedAt"];
}) {
  const { getFullDate } = useDate();
  const statusConfig =
    KB_STATUS_CONFIG[status as keyof typeof KB_STATUS_CONFIG] ||
    KB_STATUS_CONFIG.DRAFT;

  if (status === "FAILED" && errorMessage) {
    return (
      <Tooltip content={errorMessage}>
        <div className="flex items-center gap-1 w-fit cursor-default">
          <Badge color={statusConfig.color} size="2xsmall">
            <IconAlertTriangleFilled className="size-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </Tooltip>
    );
  }

  if (status === "COMPLETED" && processedAt) {
    return (
      <Tooltip
        content={getFullDate({
          date: new Date(processedAt),
          includeTime: true,
        })}
      >
        <Badge color={statusConfig.color} size="2xsmall">
          <IconCircleCheckFilled className="size-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </Tooltip>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <StatusBadge color={statusConfig.color}>{statusConfig.label}</StatusBadge>
    </div>
  );
}
