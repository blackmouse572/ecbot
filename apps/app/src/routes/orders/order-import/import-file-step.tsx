import { RouteFocusModal } from "@/components/modals";
import { Button, Text } from "@medusajs/ui";
import { FileUpload, type FileType } from "@repo/ui/common-components";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import type { OrderImportFile } from "../types";
import { parseCsv } from "./csv";
import { ImportStepBody } from "./import-step-body";

/** Step 1, Chọn file: read the CSV in the browser, nothing is sent yet. */
export const ImportFileStep: FC<{
  onFile: (file: OrderImportFile) => void;
}> = ({ onFile }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleUploaded = async ([upload]: FileType[]) => {
    if (!upload) {
      return;
    }

    URL.revokeObjectURL(upload.url);
    const [headers = [], ...records] = parseCsv(await upload.file.text());

    if (!records.length) {
      setError(t("orders.import.file.empty"));

      return;
    }

    onFile({ name: upload.file.name, headers, records });
  };

  return (
    <>
      <ImportStepBody
        title={t("orders.import.title")}
        description={t("orders.import.file.description")}
      >
        <div className="flex flex-col gap-y-2">
          <FileUpload
            label={t("orders.import.file.label")}
            hint={t("orders.import.file.hint")}
            formats={[".csv", "text/csv"]}
            multiple={false}
            hasError={!!error}
            onUploaded={handleUploaded}
          />
          {error && (
            <Text size="small" className="text-ui-fg-error">
              {error}
            </Text>
          )}
        </div>
      </ImportStepBody>
      <RouteFocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <RouteFocusModal.Close asChild>
            <Button size="small" variant="secondary" type="button">
              {t("actions.cancel")}
            </Button>
          </RouteFocusModal.Close>
        </div>
      </RouteFocusModal.Footer>
    </>
  );
};
