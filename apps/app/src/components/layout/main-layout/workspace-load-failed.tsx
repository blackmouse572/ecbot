import { ExclamationCircle } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type WorkspaceLoadFailedProps = {
  onRetry: () => void;
};

/** Shown instead of the app when the workspace could not be loaded (a 5xx or a dropped connection). */
export const WorkspaceLoadFailed: FC<WorkspaceLoadFailedProps> = ({
  onRetry,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-y-4 text-center">
        <div className="bg-ui-bg-component text-ui-fg-subtle flex size-12 items-center justify-center rounded-full">
          <ExclamationCircle />
        </div>
        <Text size="small" className="text-ui-fg-subtle text-balance">
          {t("general.loadFailed")}
        </Text>
        <Button variant="secondary" size="small" onClick={onRetry}>
          {t("actions.tryAgain")}
        </Button>
      </div>
    </div>
  );
};
