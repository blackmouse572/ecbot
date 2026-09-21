import { Tooltip } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { parseCellDate } from "../parse-cell-date";
import { PlaceholderCell } from "../placeholder-cell";
import { useDate } from "../../../../../hooks/use-date";

type DateCellProps = {
  date?: Date | string | null;
};

export const DateCell = ({ date: _date }: DateCellProps) => {
  const { getFullDate } = useDate();

  const date = parseCellDate(_date);

  if (!date) {
    return <PlaceholderCell />;
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Tooltip
        className="z-10"
        content={
          <span className="text-pretty">{`${getFullDate({
            date,
            includeTime: true,
          })}`}</span>
        }
      >
        <span className="truncate">
          {getFullDate({ date, includeTime: false })}
        </span>
      </Tooltip>
    </div>
  );
};

export const DateHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("fields.date")}</span>
    </div>
  );
};
