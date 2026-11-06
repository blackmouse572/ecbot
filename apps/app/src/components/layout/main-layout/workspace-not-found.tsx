import { resolveWorkspaceSlug } from "@/hooks/api/workspace";
import { useLastWorkspaceSlug } from "@/modules/workspace";
import { ExclamationCircle } from "@medusajs/icons";
import { Button, Heading, Text } from "@medusajs/ui";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type WorkspaceNotFoundProps = {
  workspaces: WorkSpaceGetResponseDto[];
};

/**
 * Shown instead of the app for a workspace URL the user cannot open: one
 * that does not exist or one they are not a member of. The API answers both
 * the same way, so the page does not tell them apart either.
 */
export const WorkspaceNotFound: FC<WorkspaceNotFoundProps> = ({
  workspaces,
}) => {
  const { t } = useTranslation();
  const slug = resolveWorkspaceSlug(workspaces, useLastWorkspaceSlug());
  const own = workspaces.find((w) => w.slug === slug);

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-y-4 text-center">
        <div className="bg-ui-bg-component text-ui-fg-subtle flex size-12 items-center justify-center rounded-full">
          <ExclamationCircle />
        </div>
        <div className="flex flex-col gap-y-2">
          <Heading level="h1">{t("workspace.notFound.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle text-balance">
            {t("workspace.notFound.description")}
          </Text>
        </div>
        {own && (
          <Button variant="secondary" size="small" asChild>
            <Link to={`/${own.slug}/dashboard`}>
              {t("workspace.notFound.goTo", { name: own.name })}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
