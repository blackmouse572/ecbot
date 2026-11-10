import {
  useDeleteTrackedLink,
  useUpdateTrackedLink,
  type TrackedLinkGetResponseDto,
} from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { PauseSolid, PlaySolid, Share, Trash } from "@medusajs/icons";
import { Button, clx, toast, usePrompt } from "@medusajs/ui";
import { ActionMenu } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/** A source row's Chia sẻ button and its stop, resume and delete menu (frame 1). */
export const SourceRowActions: FC<{ link: TrackedLinkGetResponseDto }> = ({
  link,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: update } = useUpdateTrackedLink(workspaceSlug, link.id);
  const { mutateAsync: remove } = useDeleteTrackedLink(workspaceSlug);
  const stopped = link.status === "STOPPED";

  const toggleStatus = async () => {
    try {
      await update({ status: stopped ? "ACTIVE" : "STOPPED" });
      toast.success(
        t(
          stopped
            ? "customerSources.detail.resumed"
            : "customerSources.detail.stopped",
        ),
      );
    } catch (error) {
      toast.error(readApiError(error).message ?? t("customerSources.error"));
    }
  };

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("customerSources.delete.title", { name: link.name }),
      description: t("customerSources.delete.description"),
      variant: "danger",
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await remove(link.id);
      toast.success(t("customerSources.delete.deleted"));
    } catch (error) {
      toast.error(readApiError(error).message ?? t("customerSources.error"));
    }
  };

  return (
    <div className="flex items-center justify-end gap-x-2">
      {link.url && (
        <Button
          size="small"
          variant="secondary"
          type="button"
          // Kept in place (hidden) on a stopped source so the ⋯ menus line up.
          className={clx(stopped && "invisible")}
          tabIndex={stopped ? -1 : undefined}
          aria-hidden={stopped || undefined}
          onClick={(event) => {
            // The row is a link to the source; this button opens its share step.
            event.preventDefault();
            event.stopPropagation();
            navigate(`${link.id}/share`);
          }}
        >
          <Share />
          {t("customerSources.share.action")}
        </Button>
      )}
      <ActionMenu
        groups={[
          {
            actions: [
              {
                icon: stopped ? <PlaySolid /> : <PauseSolid />,
                label: t(
                  stopped
                    ? "customerSources.detail.resume"
                    : "customerSources.detail.stop",
                ),
                onClick: toggleStatus,
              },
            ],
          },
          {
            actions: [
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: handleDelete,
              },
            ],
          },
        ]}
      />
    </div>
  );
};
