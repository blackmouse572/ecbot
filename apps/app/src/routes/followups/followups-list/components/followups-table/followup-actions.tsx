import {
  useCancelFollowup,
  type FollowupListResponseDto,
} from "@/hooks/api/followups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Eye, XCircle } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const FollowupActions = ({
  item,
}: {
  item: Pick<
    FollowupListResponseDto,
    "followupId" | "conversationId" | "status"
  >;
}) => {
  const { t } = useTranslation();
  const cancelFollowup = useCancelFollowup();
  const prompt = usePrompt();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  const handleViewConversation = () => {
    navigate(
      `/${workspaceSlug}/${ROUTES.Conversations}/${item.conversationId}`,
    );
  };

  const handleCancel = async () => {
    const confirmed = await prompt({
      title: t("followups.list.cancel.confirm.title"),
      description: t("followups.list.cancel.confirm.description"),
      variant: "danger",
      confirmText: t("followups.list.cancel.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await cancelFollowup.mutateAsync(item.followupId);
      toast.success(t("followups.list.cancel.success"));
    } catch (error) {
      console.error("Failed to cancel followup:", error);
      toast.error(t("followups.list.cancel.error"));
    }
  };

  // Only a pending followup still has a Cloud Task to cancel.
  const cancellable = item.status === "SCHEDULED";

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Eye />,
              label: t("followups.list.action.viewConversation"),
              onClick: handleViewConversation,
            },
          ],
        },
        ...(cancellable
          ? [
              {
                actions: [
                  {
                    icon: <XCircle />,
                    label: t("followups.list.cancel.action"),
                    onClick: handleCancel,
                  },
                ],
              },
            ]
          : []),
      ]}
    />
  );
};
