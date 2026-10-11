import { useGetToolkitAccess } from "@/hooks/api/tools";
import { Badge, Button, Skeleton, Text } from "@medusajs/ui";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { ACCESS_ACTIONS_PREVIEW } from "../constants";

type ToolkitAccessSectionProps = {
  workspaceSlug: string;
  slug: string;
  name: string;
};

/** What the toolkit can do and the account access it asks for, before the
 *  owner hands it over (#189). */
export const ToolkitAccessSection: FC<ToolkitAccessSectionProps> = ({
  workspaceSlug,
  slug,
  name,
}) => {
  const { t } = useTranslation();
  const { access, isLoading, isError } = useGetToolkitAccess(
    workspaceSlug,
    slug,
  );
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-y-2 px-6 py-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (isError || !access) {
    return (
      <Text size="small" className="text-ui-fg-subtle px-6 py-4">
        {t("tools.marketplace.access.loadError")}
      </Text>
    );
  }

  const { actions, scopes } = access;
  const shown = showAll ? actions : actions.slice(0, ACCESS_ACTIONS_PREVIEW);

  return (
    <>
      {scopes.length > 0 && (
        <div className="flex flex-col gap-y-2 px-6 py-4">
          <Text size="small" weight="plus">
            {t("tools.marketplace.access.scopesTitle")}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.marketplace.access.scopesIntro", { name })}
          </Text>
          <ul className="flex flex-col gap-y-1">
            {scopes.map((scope) => (
              <li key={scope}>
                <Text
                  size="xsmall"
                  className="text-ui-fg-subtle break-all font-mono"
                >
                  {scope}
                </Text>
              </li>
            ))}
          </ul>
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.marketplace.access.redirectNote", { name })}
          </Text>
        </div>
      )}
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" weight="plus">
          {t("tools.marketplace.access.actionsTitle", {
            count: actions.length,
          })}
        </Text>
        {actions.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.marketplace.access.actionsEmpty")}
          </Text>
        ) : (
          <>
            {actions.some((a) => a.destructive) && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("tools.marketplace.access.destructiveHint")}
              </Text>
            )}
            <ul className="flex flex-col gap-3">
              {shown.map((action) => (
                <li
                  key={action.name}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4"
                >
                  <Text
                    size="small"
                    className="text-ui-fg-base truncate font-medium"
                    title={action.name}
                  >
                    {action.name}
                    {action.destructive && (
                      <Badge size="2xsmall" color="red" className="ml-1.5">
                        {t("tools.destructiveAction")}
                      </Badge>
                    )}
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {action.description}
                  </Text>
                </li>
              ))}
            </ul>
            {actions.length > ACCESS_ACTIONS_PREVIEW && (
              <Button
                type="button"
                size="small"
                variant="transparent"
                className="self-start"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? t("tools.marketplace.access.showLess")
                  : t("tools.marketplace.access.showAll", {
                      count: actions.length,
                    })}
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
};
