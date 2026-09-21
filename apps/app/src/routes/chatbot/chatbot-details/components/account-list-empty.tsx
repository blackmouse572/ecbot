import { Text, clx } from "@medusajs/ui";
import { IconUsers } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { buttonVariants } from "node_modules/@medusajs/ui/dist/esm/components/button";

interface AccountListEmptyProps {
  chatbotId: string;
  className?: string;
}

export function AccountListEmpty({
  chatbotId,
  className,
}: AccountListEmptyProps) {
  const { t } = useTranslation();
  const workspace = useWorkspaceParams();

  // Editing returns to the detail page this empty state is rendered on.
  const prevPath = `/${workspace.workspaceSlug}/${ROUTES.Chatbot}/${chatbotId}`;
  const editUrl = `${prevPath}/edit`;

  return (
    <div
      className={clx(
        "flex flex-col gap-4 items-center justify-center py-12",
        className,
      )}
    >
      <div className="rounded-full bg-ui-bg-field p-6">
        <IconUsers size={64} className="text-ui-fg-muted" />
      </div>
      <div className="space-y-4 text-center">
        <div className="space-y-1">
          <Text weight="plus" size="xlarge">
            {t("chatbot.details.noAccounts", "No Accounts")}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {t(
              "chatbot.details.noAccountsDescription",
              "No Facebook accounts linked to this chatbot yet.",
            )}
          </Text>
        </div>
        <Link
          to={editUrl}
          state={{
            prev: prevPath,
          }}
          className={buttonVariants({ variant: "primary", size: "small" })}
        >
          {t("actions.edit", "Edit Chatbot")}
        </Link>
      </div>
    </div>
  );
}
