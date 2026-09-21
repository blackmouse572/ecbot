import { StatusBadge } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

const STATUS_COLORS: Record<
  string,
  "blue" | "green" | "red" | "orange" | "grey"
> = {
  SCHEDULED: "blue",
  COMPLETED: "green",
  FAILED: "red",
  SKIPPED: "orange",
  CANCELLED: "grey",
};

export const FollowupStatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();

  return (
    <StatusBadge color={STATUS_COLORS[status] ?? "grey"} className="text-xs">
      {t(`followups.list.status.${status.toLowerCase()}`, status)}
    </StatusBadge>
  );
};
