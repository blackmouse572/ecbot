import { useUnLinkAccount } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Link as LinkIcon, Trash } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

export const AccountActions = ({
  item,
}: {
  item: Pick<AccountListResponseDto, "id" | "link">;
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const unlinkAccount = useUnLinkAccount();
  const prompt = usePrompt();

  const handleUnlink = async (id: string) => {
    const confirmed = await prompt({
      title: t("accounts.unlink.confirm.title"),
      description: t("accounts.unlink.confirm.description"),
      variant: "danger",
      confirmText: t("accounts.unlink.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await unlinkAccount.mutateAsync(id);
      toast.success(t("accounts.unlink.success"));
    } catch (error) {
      console.error("Failed to unlink account:", error);
      toast.error(t("accounts.unlink.error"));
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <LinkIcon />,
              label: t("accounts.list.action.viewProfile"),
              to: item.link,
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("accounts.list.action.unlink"),
              onClick: () => handleUnlink(item.id),
            },
          ],
        },
      ]}
    />
  );
};
