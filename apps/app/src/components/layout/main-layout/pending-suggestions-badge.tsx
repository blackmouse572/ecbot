import { Badge } from "@medusajs/ui";
import { useNavCounts } from "@/hooks/api/nav-counts";

export const PendingSuggestionsBadge = () => {
  const { pendingSuggestions } = useNavCounts();
  if (!pendingSuggestions) return null;
  return (
    <Badge size="2xsmall" color="blue">
      {pendingSuggestions}
    </Badge>
  );
};
