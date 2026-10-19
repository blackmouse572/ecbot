import { toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type {
  ConversationGetResponseDto,
  ConversationStatus,
} from "@/hooks/api/conversations";
import { useUpdateConversationStatus } from "@/hooks/api/conversations";

/**
 * Changes the status behind a toast (the confirm dialog closes at once, so
 * the toast is the only sign that the request is running).
 */
export const useStatusChange = (conversation: ConversationGetResponseDto) => {
  const { t } = useTranslation();
  const update = useUpdateConversationStatus(conversation.id);
  const change = (status: ConversationStatus) => {
    const resolving = status === "RESOLVED";
    toast.promise(update.mutateAsync({ status }), {
      loading: resolving
        ? t("conversations.actions.resolving")
        : t("conversations.actions.restoring"),
      success: resolving
        ? t("conversations.actions.resolved")
        : t("conversations.actions.restored"),
      error: resolving
        ? t("conversations.actions.resolveFailed")
        : t("conversations.actions.restoreFailed"),
    });
  };
  return { change, isPending: update.isPending };
};

export type StatusChange = ReturnType<typeof useStatusChange>;
