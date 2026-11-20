import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button, Text } from "@medusajs/ui";
import { IconApi } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** Under the store: the way out for apps it does not have. */
export function MarketplaceCustomCallout() {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  return (
    <div className="flex items-center gap-x-3 border-t px-6 py-4">
      <IconApi size={18} className="text-ui-fg-subtle shrink-0" />
      <Text size="small" className="text-ui-fg-subtle flex-1">
        {t("tools.marketplace.custom.message")}
      </Text>
      <Button size="small" variant="secondary" asChild>
        <Link to={`/${workspaceSlug}/tools/new`}>
          {t("tools.marketplace.custom.action")}
        </Link>
      </Button>
    </div>
  );
}
