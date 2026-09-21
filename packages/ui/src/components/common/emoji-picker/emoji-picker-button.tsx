import { FaceSmile } from "@medusajs/icons";
import { IconButton, clx } from "@medusajs/ui";
import { Popover, PopoverDisclosure, PopoverProvider } from "@ariakit/react";
import { useState } from "react";
import { EmojiPicker } from "./emoji-picker";

interface EmojiPickerButtonProps {
  value?: string | null;
  onChange: (emoji: string) => void;
  className?: string;
  "aria-label"?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  loadingLabel?: string;
}

// Square trigger button (matches Input's h-8) + flyout, built on ariakit (not
// radix-ui Popover) so it composes correctly when nested inside a
// Drawer/Dialog — ariakit coordinates focus/dismiss between nested overlays,
// radix-ui Popover.Portal doesn't (its portal lands as a DOM sibling of the
// Dialog, outside its focus trap, which breaks search focus, hover, scroll
// and click inside the flyout).
const EmojiPickerButton = ({
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
  searchPlaceholder,
  noResultsLabel,
  loadingLabel,
}: EmojiPickerButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <PopoverProvider open={open} setOpen={setOpen}>
      <PopoverDisclosure
        render={(props) => (
          <IconButton
            {...props}
            type="button"
            variant="transparent"
            size="small"
            aria-label={ariaLabel}
            className={clx(
              "bg-ui-bg-field hover:bg-ui-bg-field-hover shadow-borders-base shrink-0",
              className,
            )}
          >
            {value || <FaceSmile className="text-ui-fg-muted" />}
          </IconButton>
        )}
      />
      <Popover gutter={4} className="z-50 p-0">
        <EmojiPicker
          loadingLabel={loadingLabel}
          noResultsLabel={noResultsLabel}
          onSelect={(emoji) => {
            onChange(emoji);
            setOpen(false);
          }}
          searchPlaceholder={searchPlaceholder}
        />
      </Popover>
    </PopoverProvider>
  );
};

export { EmojiPickerButton };
export type { EmojiPickerButtonProps };
