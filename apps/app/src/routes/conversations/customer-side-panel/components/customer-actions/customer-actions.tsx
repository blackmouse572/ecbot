import { useUnmergeCustomer } from "@/hooks/api/customer-merge-suggestions";
import { useEraseCustomer, useExportCustomer } from "@/hooks/api/customers";
import { downloadJson } from "@/utils";
import { EllipsisHorizontal } from "@medusajs/icons";
import { DropdownMenu, IconButton, toast, usePrompt } from "@medusajs/ui";
import { Can } from "@repo/auth";
import { useTranslation } from "react-i18next";
import { CUSTOMER_DATA_SUBJECT } from "../../../constants";

export function CustomerActions({
  customerId,
  customerName,
  onErased,
}: {
  customerId: string;
  customerName?: string | null;
  onErased?: () => void;
}) {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const unmerge = useUnmergeCustomer(customerId);
  const exportData = useExportCustomer(customerId);
  const erase = useEraseCustomer(customerId);

  const handleExport = () =>
    toast.promise(
      exportData
        .mutateAsync()
        .then((data) => downloadJson(data, `customer-${customerId}.json`)),
      {
        loading: t("conversations.customer.panel.exportData.loading"),
        success: t("conversations.customer.panel.exportData.success"),
        error: t("conversations.customer.panel.exportData.error"),
      },
    );

  const handleErase = async () => {
    const confirmed = await prompt({
      title: t("conversations.customer.panel.erase.confirm.title"),
      description: t("conversations.customer.panel.erase.confirm.body"),
      confirmText: t("conversations.customer.panel.erase.confirm.confirm"),
      cancelText: t("conversations.customer.panel.erase.confirm.cancel"),
      variant: "danger",
      // Typing the name (or a fixed word when there is none) makes a
      // permanent delete a deliberate act, not a slip of the mouse.
      verificationText:
        customerName?.trim() ||
        t("conversations.customer.panel.erase.confirm.verification"),
    });

    if (!confirmed) return;

    try {
      await erase.mutateAsync();
      toast.success(t("conversations.customer.panel.erase.toast.success"));
      onErased?.();
    } catch {
      toast.error(t("conversations.customer.panel.erase.toast.failed"));
    }
  };

  const handleUnmerge = async () => {
    const confirmed = await prompt({
      title: t("conversations.customer.panel.unmerge.confirm.title"),
      description: t("conversations.customer.panel.unmerge.confirm.body"),
      confirmText: t("conversations.customer.panel.unmerge.confirm.confirm"),
      cancelText: t("conversations.customer.panel.unmerge.confirm.cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await unmerge.mutateAsync();
      toast.success(t("conversations.customer.panel.unmerge.toast.success"));
    } catch (e) {
      toast.error(t("conversations.customer.panel.unmerge.toast.failed"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("conversations.customer.panel.actions.more")}
        >
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={handleUnmerge} disabled={unmerge.isPending}>
          {t("conversations.customer.panel.unmerge.action")}
        </DropdownMenu.Item>
        <Can I="read" a={CUSTOMER_DATA_SUBJECT}>
          <DropdownMenu.Item
            onClick={handleExport}
            disabled={exportData.isPending}
          >
            {t("conversations.customer.panel.exportData.action")}
          </DropdownMenu.Item>
        </Can>
        <Can I="delete" a={CUSTOMER_DATA_SUBJECT}>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={handleErase}
            disabled={erase.isPending}
            className="text-ui-fg-error"
          >
            {t("conversations.customer.panel.erase.action")}
          </DropdownMenu.Item>
        </Can>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
