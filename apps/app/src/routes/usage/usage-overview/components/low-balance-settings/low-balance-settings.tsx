import { useUpdateTokenUsageSettings } from "@/hooks/api/token-usage";
import { Button, Drawer, Text, toast } from "@medusajs/ui";
import { Slider } from "@repo/ui/components";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Matches the API's own bounds: below 1 the warning could never fire, above 90
// it would fire on a nearly untouched period.
const MIN = 1;
const MAX = 90;
const DEFAULT_THRESHOLD = 20;

/**
 * Edits the point at which the workspace owner gets warned, expressed as the
 * percentage of quota still remaining.
 *
 * A slider rather than a number field: the value is a coarse preference over a
 * narrow bounded range, where "about a fifth left" is the real intent and the
 * exact integer rarely matters.
 */
export function LowBalanceSettings({ threshold }: { threshold?: number }) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useUpdateTokenUsageSettings();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(threshold ?? DEFAULT_THRESHOLD);

  // The summary loads after first paint, so seed the slider once it arrives —
  // and again whenever the drawer reopens, so a cancelled edit doesn't stick.
  useEffect(() => {
    if (!open) setValue(threshold ?? DEFAULT_THRESHOLD);
  }, [threshold, open]);

  const onSave = async () => {
    await mutateAsync({ lowBalanceThreshold: value });
    toast.success(t("usage.settings.saved"));
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="secondary" size="small">
          {t("usage.settings.edit")}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("usage.settings.title")}</Drawer.Title>
          <Drawer.Description>
            {t("usage.settings.description")}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-6">
          <Slider
            min={MIN}
            max={MAX}
            step={1}
            value={value}
            onValueChange={(next) =>
              setValue(Array.isArray(next) ? next[0] : next)
            }
          >
            <div className="flex items-baseline justify-between">
              <Slider.Label>{t("usage.settings.threshold")}</Slider.Label>
              <Slider.Value className="txt-compact-large-plus text-ui-fg-base">
                {() => `${value}%`}
              </Slider.Value>
            </div>
            <Slider.Control>
              <Slider.Track>
                <Slider.Indicator />
                <Slider.Thumb />
              </Slider.Track>
            </Slider.Control>
            <div className="text-ui-fg-muted flex justify-between">
              <Text size="xsmall">{MIN}%</Text>
              <Text size="xsmall">{MAX}%</Text>
            </div>
          </Slider>

          <Text size="small" className="text-ui-fg-subtle">
            {t("usage.settings.preview", { percent: value })}
          </Text>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary" size="small">
              {t("actions.cancel")}
            </Button>
          </Drawer.Close>
          <Button size="small" isLoading={isPending} onClick={onSave}>
            {t("actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
