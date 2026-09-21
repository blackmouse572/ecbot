import { Badge } from "@medusajs/ui";
import { usePausedConversationsCount } from "@/hooks/api/conversations";

export const PausedConversationsBadge = () => {
  const count = usePausedConversationsCount();
  if (!count) return null;
  return (
    <Badge size="2xsmall" color="orange">
      {count}
    </Badge>
  );
};
