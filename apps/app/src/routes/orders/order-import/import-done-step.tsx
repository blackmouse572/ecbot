import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { Button } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { OrderImportSummary } from "../types";
import { ImportStepBody } from "./import-step-body";
import { ImportSummaryCard } from "./import-summary-card";
import { InvalidLinesNotice } from "./invalid-lines-notice";

/** Step 3, Nhập: what came in, and the rows that did not. */
export const ImportDoneStep: FC<{ summary: OrderImportSummary }> = ({
  summary,
}) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  return (
    <>
      <ImportStepBody
        title={t("orders.import.done.title", { count: summary.orders })}
        description={t("orders.import.done.description")}
      >
        <ImportSummaryCard summary={summary} />
        <InvalidLinesNotice lines={summary.invalidLines} done />
      </ImportStepBody>
      <RouteFocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <Button size="small" type="button" onClick={() => handleSuccess()}>
            {t("orders.import.done.view")}
          </Button>
        </div>
      </RouteFocusModal.Footer>
    </>
  );
};
