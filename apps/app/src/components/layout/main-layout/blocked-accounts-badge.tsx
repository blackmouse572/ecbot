import { Badge } from "@medusajs/ui";
import { useNavCounts } from "@/hooks/api/nav-counts";

export const BlockedAccountsBadge = () => {
  const { accountsNeedingAttention } = useNavCounts();
  if (!accountsNeedingAttention) return null;
  return (
    <Badge size="2xsmall" color="red">
      {accountsNeedingAttention}
    </Badge>
  );
};
