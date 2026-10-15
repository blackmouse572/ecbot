import { LockClosedSolid } from "@medusajs/icons";
import { Button, Heading, Text } from "@medusajs/ui";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type WorkspaceSuspendedProps = {
  workspaces: WorkSpaceGetResponseDto[];
  currentSlug?: string;
};

/** Shown instead of the app when an admin suspended the open workspace. */
export const WorkspaceSuspended: FC<WorkspaceSuspendedProps> = ({
  workspaces,
  currentSlug,
}) => {
  const { t } = useTranslation();
  const other = workspaces.find((w) => w.slug !== currentSlug);

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-y-4 text-center">
        <div className="bg-ui-bg-component text-ui-fg-subtle flex size-12 items-center justify-center rounded-full">
          <LockClosedSolid />
        </div>
        <div className="flex flex-col gap-y-2">
          <Heading level="h1">{t("workspace.suspended.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle text-balance">
            {t("workspace.suspended.description")}
          </Text>
        </div>
        {other && (
          <Button variant="secondary" size="small" asChild>
            <Link to={`/${other.slug}/dashboard`}>
              {t("workspace.suspended.goTo", { name: other.name })}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
