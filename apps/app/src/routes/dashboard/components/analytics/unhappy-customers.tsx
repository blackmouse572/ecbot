import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import type { UnhappyCustomer } from "@/hooks/api/workspace-analytics";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { TriangleRightMini } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** Customers the classifier marked unhappy, newest first, each opening its
 * conversation so someone can follow up. */
export const UnhappyCustomers: FC<{ rows: UnhappyCustomer[] }> = ({ rows }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const when = new Intl.DateTimeFormat(i18n.language, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("dashboard.analytics.unhappy.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("dashboard.analytics.unhappy.description")}
        </Text>
      </div>
      {rows.length === 0 ? (
        <Text size="small" className="text-ui-fg-muted px-6 py-4">
          {t("dashboard.analytics.unhappy.empty")}
        </Text>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.conversationId}>
              <Link
                to={`/${workspaceSlug}/${ROUTES.Conversations}/${row.conversationId}`}
                className="hover:bg-ui-bg-base-hover flex items-center gap-x-3 px-6 py-3 outline-none focus-visible:bg-ui-bg-base-hover"
              >
                <PlatformIcon type={row.platform} size={20} />
                <div className="min-w-0 flex-1">
                  <Text size="small" weight="plus" className="truncate">
                    {row.name}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {row.emoji ? `${row.emoji} ` : ""}
                    {row.tagName}
                  </Text>
                </div>
                <Text size="xsmall" className="text-ui-fg-muted tabular-nums">
                  {when.format(new Date(row.at))}
                </Text>
                <TriangleRightMini className="text-ui-fg-muted shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
};
