import { toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { useUpdateConversationStatus } from "@/hooks/api/conversations";

/**
 * Resolves behind a toast (the confirm dialog closes at once, so the toast is
 * the only sign that the request is running).
 */
export const useResolveConversation = (
  conversation: ConversationGetResponseDto,
) => {
  const { t } = useTranslation();
  const update = useUpdateConversationStatus(conversation.id);
  const resolve = () => {
    toast.promise(update.mutateAsync({ status: "RESOLVED" }), {
      loading: t("conversations.actions.resolving"),
      success: t("conversations.actions.resolved"),
      error: t("conversations.actions.resolveFailed"),
    });
  };
  return { resolve, isPending: update.isPending };
};
