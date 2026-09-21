import { useWorkspace } from "@/hooks/api";
import { House } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import { IconError404 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "../constants";

export const NotFound = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const title = t("errorBoundary.badRequestTitle");
  const message = t("errorBoundary.badRequestMessage");

  const { pathname } = useLocation();
  const startPathSegment = pathname.split("/")[1];

  const isAbsolutePath = Object.values(ROUTES).includes(startPathSegment as A);

  if (isAbsolutePath && workspace) {
    return <Navigate to={`${workspace.slug}${pathname}`} replace />;
  }

  return (
    <div className="flex size-full min-h-[calc(100vh-57px-24px)] items-center justify-center">
      <div className="flex flex-col gap-y-6">
        <div className="text-ui-fg-subtle flex flex-col items-center gap-y-3">
          <IconError404 size={125} />
          <div className="flex flex-col items-center justify-center gap-y-1">
            <Text size="large" leading="compact" weight="plus">
              {title}
            </Text>
            <Text className="text-ui-fg-muted text-balance text-center">
              {message}
            </Text>
          </div>
          <div className="flex gap-4 items-center justify-center">
            <Button asChild>
              <Link to="/">
                <House />
                {t("app.nav.main.home")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
