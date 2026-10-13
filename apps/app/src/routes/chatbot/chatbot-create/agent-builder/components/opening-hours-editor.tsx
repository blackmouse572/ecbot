import { MAX_RANGES_PER_DAY, WEEKDAYS, type Weekday } from "@repo/agent-blueprint";
import { Button, IconButton, Input, Switch, Text } from "@medusajs/ui";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useId, type FC } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_RANGE, type OpeningWeek } from "../opening-hours-form";

type Props = { value: OpeningWeek; onChange: (week: OpeningWeek) => void };

/** One row per weekday: open or closed, and up to three same-day ranges (#289). */
export const OpeningHoursEditor: FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const id = useId();
  const firstOpen = WEEKDAYS.find((d) => value[d].length > 0);
  const setDay = (day: Weekday, ranges: OpeningWeek[Weekday]) => onChange({ ...value, [day]: ranges });

  return (
    <div className="flex flex-col divide-y divide-ui-border-base">
      {WEEKDAYS.map((day) => {
        const ranges = value[day];
        const open = ranges.length > 0;
        const switchId = `${id}-${day}`;
        return (
          <div key={day} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-2">
            <div className="flex w-36 items-center gap-2 pt-1.5">
              <Switch
                id={switchId}
                size="small"
                checked={open}
                onCheckedChange={(on) => setDay(day, on ? [{ ...DEFAULT_RANGE }] : [])}
              />
              <label htmlFor={switchId}>
                <Text size="small" weight="plus" as="span">{t(`agentBuilder.weekdays.${day}`)}</Text>
              </label>
            </div>
            {open ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {ranges.map((range, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      size="small"
                      aria-label={`${t(`agentBuilder.weekdays.${day}`)}: ${t("agentBuilder.ui.hoursFrom")}`}
                      value={range.open}
                      onChange={(e) => setDay(day, ranges.map((r, j) => (j === i ? { ...r, open: e.target.value } : r)))}
                    />
                    <Text size="small" className="text-ui-fg-muted">-</Text>
                    <Input
                      type="time"
                      size="small"
                      aria-label={`${t(`agentBuilder.weekdays.${day}`)}: ${t("agentBuilder.ui.hoursTo")}`}
                      value={range.close}
                      onChange={(e) => setDay(day, ranges.map((r, j) => (j === i ? { ...r, close: e.target.value } : r)))}
                    />
                    <IconButton
                      type="button"
                      size="small"
                      variant="transparent"
                      aria-label={t("agentBuilder.ui.hoursRemoveRange")}
                      onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}
                    >
                      <IconX size={16} />
                    </IconButton>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {ranges.length < MAX_RANGES_PER_DAY && (
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() => setDay(day, [...ranges, { ...DEFAULT_RANGE }])}
                    >
                      <IconPlus size={14} />
                      {t("agentBuilder.ui.hoursAddRange")}
                    </Button>
                  )}
                  {day === firstOpen && (
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() => onChange(Object.fromEntries(WEEKDAYS.map((d) => [d, ranges.map((r) => ({ ...r }))])) as OpeningWeek)}
                    >
                      {t("agentBuilder.ui.hoursCopyToAll")}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Text size="small" className="pt-1.5 text-ui-fg-muted">{t("agentBuilder.ui.hoursClosed")}</Text>
            )}
          </div>
        );
      })}
    </div>
  );
};
