import { RouteFocusModal } from "@/components/modals";
import { ProgressTabs, type ProgressStatus } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OrderImportFile, OrderImportSummary } from "../types";
import { ImportDoneStep } from "./import-done-step";
import { ImportFileStep } from "./import-file-step";
import { ImportMapStep } from "./import-map-step";

const STEPS = ["file", "map", "done"] as const;

/**
 * Frame 14e, Nhập đơn từ file: choose a CSV, match its columns to order
 * details with a preview of what comes in, then import.
 */
export const OrderImport = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<OrderImportFile | null>(null);
  const [summary, setSummary] = useState<OrderImportSummary | null>(null);

  const step = summary ? "done" : file ? "map" : "file";

  const status = (of: (typeof STEPS)[number]): ProgressStatus =>
    of === step
      ? "in-progress"
      : STEPS.indexOf(of) < STEPS.indexOf(step)
        ? "completed"
        : "not-started";

  return (
    <RouteFocusModal>
      <ProgressTabs
        value={step}
        onValueChange={(value) => value === "file" && setFile(null)}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header>
          <RouteFocusModal.Title asChild>
            <span className="sr-only">{t("orders.import.title")}</span>
          </RouteFocusModal.Title>
          <div className="-my-2 w-full min-w-0 border-l">
            <ProgressTabs.List>
              {STEPS.map((of) => (
                <ProgressTabs.Trigger
                  key={of}
                  value={of}
                  status={status(of)}
                  // Only back to the file, and not once the orders are in.
                  disabled={of !== "file" || step !== "map"}
                  className="max-w-[200px]"
                >
                  {t(`orders.import.steps.${of}`)}
                </ProgressTabs.Trigger>
              ))}
            </ProgressTabs.List>
          </div>
        </RouteFocusModal.Header>
        {summary ? (
          <ImportDoneStep summary={summary} />
        ) : file ? (
          <ImportMapStep
            file={file}
            onBack={() => setFile(null)}
            onDone={setSummary}
          />
        ) : (
          <ImportFileStep onFile={setFile} />
        )}
      </ProgressTabs>
    </RouteFocusModal>
  );
};
