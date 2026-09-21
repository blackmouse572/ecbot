import { useDeleteChatbot } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PencilSquare, SquareTwoStack, Trash, XCircle } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const ChatbotActions = ({
  item,
}: {
  item: Pick<ChatbotGetDetailResponseDto, "id" | "name">;
}) => {
  const { t } = useTranslation();
  const deleteChatbot = useDeleteChatbot();
  const prompt = usePrompt();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("chatbot.list.delete.confirm.title"),
      description: t("chatbot.list.delete.confirm.description", {
        name: item.name,
      }),
      variant: "danger",
      confirmText: t("chatbot.list.delete.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await deleteChatbot.mutateAsync({
        id: item.id as string,
      });
      toast.success(t("chatbot.list.delete.success"));
      navigate(`/${workspaceSlug}/chatbot`);
    } catch (error) {
      console.error("Failed to delete chatbot:", error);
      toast.error(t("chatbot.list.delete.error"));
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () =>
                navigate(`/${workspaceSlug}/chatbot/${item.id}/edit`),
            },
            {
              icon: <SquareTwoStack />,
              label: t("chatbot.list.action.clone"),
              onClick: () =>
                navigate(`/${workspaceSlug}/chatbot/${item.id}/clone`),
            },
            {
              icon: <XCircle />,
              label: t("chatbot.list.action.stop"),
              onClick: () => navigate(`/${workspaceSlug}/chatbot/${item.id}`),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("chatbot.list.action.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  );
};
