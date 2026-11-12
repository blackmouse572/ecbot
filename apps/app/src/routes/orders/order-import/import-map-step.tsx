import { RouteFocusModal } from "@/components/modals";
import {
  useImportOrders,
  useOrderImportPreview,
  type OrderImportResponseDto,
} from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { DocumentText } from "@medusajs/icons";
import { Button, Heading, Skeleton, Text, toast } from "@medusajs/ui";
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import type { OrderImportFile, OrderImportSummary } from "../types";
import {
  buildImportLines,
  chunkImportLines,
  guessMapping,
  summarizeImport,
} from "./import-rows";
import { ImportMappingTable } from "./import-mapping-table";
import { ImportStepBody } from "./import-step-body";
import { ImportSummaryCard } from "./import-summary-card";
import { InvalidLinesNotice } from "./invalid-lines-notice";

const NO_RESULTS: OrderImportResponseDto[] = [];

/**
 * Step 2, Ghép cột: the guessed mapping to check, and a dry run of the file
 * with it, so the shop sees what comes in before anything is written.
 */
export const ImportMapStep: FC<{
  file: OrderImportFile;
  onBack: () => void;
  onDone: (summary: OrderImportSummary) => void;
}> = ({ file, onBack, onDone }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [mapping, setMapping] = useState(() => guessMapping(file.headers));

  const { chunks, cancelled } = useMemo(() => {
    const built = buildImportLines(file.records, mapping);

    return {
      chunks: chunkImportLines(built.lines),
      cancelled: built.cancelled,
    };
  }, [file.records, mapping]);

  const missing = !mapping.includes("phone")
    ? "needPhone"
    : !mapping.includes("item") && !mapping.includes("total")
      ? "needItem"
      : null;

  const preview = useOrderImportPreview(
    workspaceSlug,
    missing ? [] : chunks.map((chunk) => chunk.rows),
  );

  // With no rows left to send (all cancelled, say) there is nothing to check.
  const previewData = chunks.length ? preview.data : NO_RESULTS;

  const summary = useMemo(
    () => previewData && summarizeImport(previewData, chunks, cancelled),
    [previewData, chunks, cancelled],
  );

  const importOrders = useImportOrders(workspaceSlug);
  // Results of the requests already imported, in chunk order: a retry after a
  // failure sends only the rest, since rows without a code would come twice.
  const imported = useRef<OrderImportResponseDto[]>([]);

  useEffect(() => {
    imported.current = [];
  }, [chunks]);

  const handleImport = async () => {
    const results = imported.current;

    try {
      await importOrders.mutateAsync({
        chunks: chunks.slice(results.length).map((chunk) => chunk.rows),
        onChunk: (result) => results.push(result),
      });
      onDone(summarizeImport(results, chunks, cancelled));
    } catch (error) {
      const count = results.reduce((sum, result) => sum + result.orders, 0);

      toast.error(
        count
          ? t("orders.import.partial", { count })
          : (readApiError(error).message ?? t("orders.error")),
      );
    }
  };

  return (
    <>
      <ImportStepBody
        title={t("orders.import.title")}
        description={t("orders.import.map.description")}
      >
        <div className="shadow-elevation-card-rest flex items-center gap-x-3 rounded-lg px-4 py-3">
          <DocumentText className="text-ui-fg-subtle shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <Text size="small" weight="plus" className="truncate">
              {file.name}
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted tabular-nums">
              {t("orders.import.file.meta", {
                rows: file.records.length,
                columns: file.headers.length,
              })}
            </Text>
          </div>
          <Button size="small" variant="transparent" onClick={onBack}>
            {t("orders.import.file.change")}
          </Button>
        </div>

        <div className="flex flex-col gap-y-2">
          <ImportMappingTable
            headers={file.headers}
            sample={file.records[0] ?? []}
            mapping={mapping}
            onChange={setMapping}
          />
          <Text size="xsmall" className="text-ui-fg-muted">
            {t(
              mapping.includes("status")
                ? "orders.import.map.withStatus"
                : "orders.import.map.noStatus",
            )}{" "}
            {t("orders.import.map.sameCode")}
          </Text>
        </div>

        <div className="flex flex-col gap-y-3">
          <Heading level="h3">{t("orders.import.preview.title")}</Heading>
          {missing ? (
            <Text
              size="small"
              className="bg-ui-bg-subtle text-ui-fg-subtle rounded-lg px-4 py-3"
            >
              {t(`orders.import.map.${missing}`)}
            </Text>
          ) : summary ? (
            <>
              <ImportSummaryCard summary={summary} />
              <InvalidLinesNotice lines={summary.invalidLines} />
            </>
          ) : preview.isError ? (
            <Text size="small" className="text-ui-fg-error">
              {readApiError(preview.error).message ?? t("orders.error")}
            </Text>
          ) : (
            <Skeleton
              className="h-[74px] w-full rounded-lg"
              aria-label={t("orders.import.preview.checking")}
            />
          )}
        </div>
      </ImportStepBody>
      <RouteFocusModal.Footer>
        <div className="flex w-full items-center justify-between gap-x-2">
          <Button size="small" variant="secondary" onClick={onBack}>
            {t("actions.back")}
          </Button>
          <div className="flex items-center gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              size="small"
              onClick={handleImport}
              disabled={!summary?.orders}
              isLoading={importOrders.isPending}
            >
              {summary && !summary.orders
                ? t("orders.import.nothing")
                : t("orders.import.submit", { count: summary?.orders ?? 0 })}
            </Button>
          </div>
        </div>
      </RouteFocusModal.Footer>
    </>
  );
};
