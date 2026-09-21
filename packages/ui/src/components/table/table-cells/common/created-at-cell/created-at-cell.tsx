import { Tooltip } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useDate } from "../../../../../hooks/use-date";
import { parseCellDate } from "../parse-cell-date";
import { PlaceholderCell } from "../placeholder-cell";

type DateCellProps = {
  date: Date | string | undefined;
};

export const CreatedAtCell = ({ date: _date }: DateCellProps) => {
  const { getRelativeDateOrFullDate, getFullDate } = useDate();
  const date = parseCellDate(_date);

  if (!date) {
    return <PlaceholderCell />;
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Tooltip
        className="z-10"
        content={
          <span className="text-pretty">
            {getFullDate({ date, includeTime: true })}
          </span>
        }
      >
        <span className="truncate">
          {getRelativeDateOrFullDate(date, {
            maxTime: 1000,
          })}
        </span>
      </Tooltip>
    </div>
  );
};

export const CreatedAtHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("fields.createdAt")}</span>
    </div>
  );
};
