import { Badge } from "@medusajs/ui";
import { useNavCounts } from "@/hooks/api/nav-counts";

export const ToolsAttentionBadge = () => {
  const { toolsNeedingAttention } = useNavCounts();
  if (!toolsNeedingAttention) return null;
  return (
    <Badge size="2xsmall" color="orange">
      {toolsNeedingAttention}
    </Badge>
  );
};
