import { ArrowPath, PencilSquare, Trash } from "@medusajs/icons";
import { useTranslation } from "react-i18next";
import { ActionMenu } from "@repo/ui/common-components";
import { toast, usePrompt } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { ROUTES } from "../../../../constants";
import {
  useDeleteKnowledgeItem,
  useProcessKnowledgeItem,
} from "../../../../../hooks/api/knowledge-base";
import { useCallback } from "react";
import { useWorkspaceParams } from "../../../../../hooks/use-workspace-params";

type KnowledgeBaseActionsProps = {
  item: KnowledgeItemResponseDto;
  knowledgeBaseId?: string;
};

export const KnowledgeBaseActions = ({
  item,
  knowledgeBaseId,
}: KnowledgeBaseActionsProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const prompt = usePrompt();
  const deleteMutation = useDeleteKnowledgeItem(knowledgeBaseId || "");
  const processMutation = useProcessKnowledgeItem();

  const isProcessing = item.status === "PROCESSING";
  const canProcess = ["DRAFT", "READY", "FAILED", "COMPLETED"].includes(
    item.status,
  );
  const processLabel =
    item.status === "COMPLETED"
      ? t("knowledgeBase.actions.reprocess")
      : t("knowledgeBase.actions.process");

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await prompt({
          title: t("general.areYouSure"),
          description: t("knowledgeBase.delete.confirm.description"),
          confirmText: t("knowledgeBase.delete.confirm.confirmButton"),
          cancelText: t("actions.cancel"),
        });

        if (!res) {
          return;
        }

        await deleteMutation.mutateAsync(id);
        toast.success(t("knowledgeBase.delete.success"));
      } catch (e) {
        console.error("Error deleting knowledge item", e);
        toast.error(t("knowledgeBase.delete.error"));
      }
    },
    [deleteMutation, prompt, t],
  );

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              to: `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/${item.id}/edit`,
            },
            ...(canProcess
              ? [
                  {
                    icon: <ArrowPath />,
                    label: processLabel,
                    disabled: isProcessing || processMutation.isPending,
                    onClick: () =>
                      processMutation.mutate(
                        {
                          knowledgeBaseId:
                            knowledgeBaseId || item.knowledgeBaseId,
                          id: item.id,
                        },
                        {
                          onSuccess: () =>
                            toast.success(
                              t("knowledgeBase.actions.processQueued"),
                            ),
                        },
                      ),
                  },
                ]
              : []),
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: () => handleDelete(item.id),
              disabled: item.status === "PROCESSING",
            },
          ],
        },
      ]}
    />
  );
};
