import { Text } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import type { OrderImportSummary } from "../types";

/** The orange strip under the counts: rows left out, and why, line by line. */
export const InvalidLinesNotice: FC<{
  lines: OrderImportSummary["invalidLines"];
  /** After the import: the rows were left out, not will be. */
  done?: boolean;
}> = ({ lines, done }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!lines.length) {
    return null;
  }

  const reasons = new Set(lines.map((line) => line.reason));
  const [reason] = reasons;
  const count = lines.length;

  return (
    <div className="bg-ui-tag-orange-bg text-ui-tag-orange-text flex flex-col gap-y-2 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-x-3">
        <Text size="small">
          <span className="font-medium">
            {reasons.size === 1
              ? t("orders.import.invalid.rows", {
                  count,
                  reason: t(`orders.import.reasons.${reason}`),
                })
              : t("orders.import.invalid.count", { count })}
          </span>{" "}
          {t(
            done
              ? "orders.import.invalid.afterDone"
              : "orders.import.invalid.after",
          )}
        </Text>
        <button
          type="button"
          className="txt-compact-small-plus ml-auto shrink-0 underline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open
            ? t("orders.import.invalid.hide")
            : t("orders.import.invalid.show", { count })}
        </button>
      </div>
      {open && (
        <ul className="txt-compact-small flex max-h-48 flex-col gap-y-1 overflow-y-auto">
          {lines.map(({ line, reason: why }) => (
            <li key={line}>
              <span className="font-medium tabular-nums">
                {t("orders.import.invalid.line", { line })}
              </span>
              : {t(`orders.import.reasons.${why}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
