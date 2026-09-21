import { toast } from "@medusajs/ui";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

// Shape returned by every `/batch/*` endpoint.
export type BatchResult = {
  succeeded: string[];
  failed: { id: string; reason: string }[];
};

/**
 * Turn a partial-success batch response into a single toast:
 * all succeeded -> success, all failed -> error, mixed -> warning with counts.
 */
export const useBatchResultToast = () => {
  const { t } = useTranslation();

  return useCallback(
    (result: BatchResult | undefined) => {
      const succeeded = result?.succeeded?.length ?? 0;
      const failed = result?.failed?.length ?? 0;

      if (failed === 0) {
        toast.success(t("general.batch.success", { count: succeeded }));
        return;
      }

      if (succeeded === 0) {
        toast.error(t("general.batch.error", { count: failed }));
        return;
      }

      toast.warning(t("general.batch.partial", { success: succeeded, failed }));
    },
    [t],
  );
};
