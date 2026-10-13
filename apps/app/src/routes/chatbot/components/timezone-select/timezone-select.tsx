import { CheckMini, TrianglesMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Command } from "cmdk";
import { Popover as RadixPopover } from "radix-ui";
import {
  type ButtonHTMLAttributes,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  canonicalZone,
  filterTimezoneOptions,
  getTimezoneOptions,
  type TimezoneOption,
} from "./build-timezone-options";

// Form.Control passes id / aria-* onto its child, so they land on the trigger.
type TimezoneSelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onChange"
> & {
  value?: string | null;
  onChange: (value: string | null) => void;
  ref?: Ref<HTMLButtonElement>;
};

const ROW_HEIGHT = 32;

const itemClassName =
  "hover:bg-ui-bg-base-hover aria-selected:bg-ui-bg-base-pressed text-ui-fg-base txt-compact-small flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 outline-none transition-colors";

// ~420 zones: the list is built once per session on first open and only the
// visible rows render, so neither the form nor the popover pays for all of it.
export function TimezoneSelect({
  value,
  onChange,
  ref,
  ...triggerProps
}: TimezoneSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<TimezoneOption[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filterTimezoneOptions(options, search),
    [options, search],
  );

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const handleOpenChange = (next: boolean) => {
    if (next && !options.length) setOptions(getTimezoneOptions());
    if (!next) setSearch("");
    setOpen(next);
  };

  // A zone stored under an old ICU id still matches its row.
  const selected = value ? canonicalZone(value) : null;

  useEffect(() => {
    if (!open || search) return;
    const index = filtered.findIndex((option) => option.value === selected);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "center" });
    // Only when the list opens: scrolling on every render would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options]);

  const select = (zone: string | null) => {
    onChange(zone);
    handleOpenChange(false);
  };

  const defaultLabel = t("chatbot.create.timezoneDefault");

  return (
    <RadixPopover.Root modal open={open} onOpenChange={handleOpenChange}>
      <RadixPopover.Trigger asChild>
        <button
          {...triggerProps}
          ref={ref}
          type="button"
          className="bg-ui-bg-field shadow-buttons-neutral hover:bg-ui-bg-field-hover focus-visible:shadow-borders-interactive-with-active txt-compact-small text-ui-fg-base flex h-8 w-full items-center justify-between gap-x-2 rounded-md px-2 outline-none transition-fg"
        >
          <span className={clx("truncate", { "text-ui-fg-muted": !value })}>
            {value || defaultLabel}
          </span>
          <TrianglesMini className="text-ui-fg-muted shrink-0" />
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          className="bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-50 w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-hidden rounded-lg outline-none"
        >
          <Command shouldFilter={false}>
            <div className="border-b p-1">
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={t("general.search")}
                className="txt-compact-small placeholder:text-ui-fg-muted w-full bg-transparent px-2 py-1 outline-none"
              />
            </div>
            <Command.List>
              {!search && (
                <div className="p-1 pb-0">
                  <Command.Item
                    value="__default__"
                    onSelect={() => select(null)}
                    className={itemClassName}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <CheckMini className={clx({ invisible: !!value })} />
                    {defaultLabel}
                  </Command.Item>
                </div>
              )}
              {filtered.length === 0 ? (
                <div className="txt-compact-small text-ui-fg-muted p-2 text-center">
                  {t("general.noResultsTitle")}
                </div>
              ) : (
                <div ref={listRef} className="max-h-[240px] overflow-auto p-1">
                  <div
                    className="relative w-full"
                    style={{ height: virtualizer.getTotalSize() }}
                  >
                    {virtualizer.getVirtualItems().map((row) => {
                      const option = filtered[row.index];
                      return (
                        <Command.Item
                          key={option.value}
                          value={option.value}
                          data-checked={option.value === selected}
                          onSelect={() => select(option.value)}
                          className={clx(
                            itemClassName,
                            "absolute left-0 top-0",
                          )}
                          style={{
                            height: row.size,
                            transform: `translateY(${row.start}px)`,
                          }}
                        >
                          <CheckMini
                            className={clx({
                              invisible: option.value !== selected,
                            })}
                          />
                          <span className="truncate">{option.label}</span>
                        </Command.Item>
                      );
                    })}
                  </div>
                </div>
              )}
            </Command.List>
          </Command>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
