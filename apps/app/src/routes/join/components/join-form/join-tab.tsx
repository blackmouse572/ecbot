import { useJoinWorkspace } from "@/hooks/api";
import { House } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import { IconFaceIdError, IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
type JoinTabProps = {
  onJoinSuccess: () => void;
};
export const JoinTab = ({ onJoinSuccess }: JoinTabProps) => {
  const { t } = useTranslation();
  const {
    mutateAsync: joinWorkspace,
    isPending,
    error,
    isError,
  } = useJoinWorkspace({
    onSuccess: onJoinSuccess,
  });
  const [search] = useSearchParams();
  const token = search.get("tokens");

  useEffect(() => {
    if (token) {
      joinWorkspace(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center p-16 h-full">
      <div className="flex w-full max-w-[720px] h-full flex-col gap-y-8 items-center justify-center">
        {isPending && (
          <IconLoader2 className="mx-auto animate-spin text-ui-fg-muted" />
        )}
        {isError && <IconFaceIdError className="mx-auto text-ui-fg-muted" />}

        {isPending ? (
          <div className="space-y-2">
            <Text
              size="xlarge"
              leading="compact"
              weight="plus"
              className="text-center"
            >
              {t("join.loading.title")}
            </Text>
            <Text
              size="xlarge"
              className="text-ui-fg-muted text-balance text-center"
            >
              {t("join.loading.description")}
            </Text>
          </div>
        ) : (
          <div className="space-y-2">
            <Text
              size="xlarge"
              leading="compact"
              weight="plus"
              className="text-center"
            >
              {t("errorBoundary.defaultTitle")}
            </Text>
            <Text
              size="xlarge"
              className="text-ui-fg-muted text-balance text-center"
            >
              {error?.message || t("errorBoundary.defaultMessage")}
            </Text>
            <div className="flex gap-4 py-4 items-center justify-center">
              <Link to="/">
                <Button>
                  <House />
                  {t("app.nav.main.home")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
