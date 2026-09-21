import { FaceSmile, PlusMini } from "@medusajs/icons";
import { IconButton } from "@medusajs/ui";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { EmojiPicker } from "../emoji-picker";

export interface ReactionPickerProps {
  /**
   * Emoji offered in the quick row. Which emoji are actually accepted is
   * platform-specific, so the caller owns this list.
   */
  quickReactions: readonly string[];
  onSelect: (emoji: string) => void;
  /** Which edge of the trigger the popups line up with. */
  align?: "start" | "end";
  className?: string;
  triggerLabel?: string;
  quickReactLabel?: (emoji: string) => string;
  moreLabel?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  loadingLabel?: string;
}

/**
 * Emoji trigger that opens a quick-reaction row, with a nested popup holding
 * the full picker behind the plus button.
 */
const ReactionPicker = ({
  quickReactions,
  onSelect,
  align = "start",
  className,
  triggerLabel = "Add reaction",
  quickReactLabel = (emoji) => `React with ${emoji}`,
  moreLabel = "More emoji",
  searchPlaceholder,
  noResultsLabel,
  loadingLabel,
}: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // A pick from either row is a completed action — collapse the whole stack.
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setPickerOpen(false);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <IconButton
            type="button"
            size="2xsmall"
            variant="transparent"
            aria-label={triggerLabel}
            className={className}
          >
            <FaceSmile />
          </IconButton>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="top" align={align} sideOffset={8}>
          <Popover.Popup className="shadow-elevation-flyout bg-ui-bg-base z-50 flex items-center gap-0.5 rounded-full p-1">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                aria-label={quickReactLabel(emoji)}
                className="hover:bg-ui-bg-base-hover transition-fg flex size-8 items-center justify-center rounded-full text-lg"
              >
                {emoji}
              </button>
            ))}
            <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
              <Popover.Trigger
                render={
                  <IconButton
                    type="button"
                    size="2xsmall"
                    variant="transparent"
                    aria-label={moreLabel}
                    className="size-8 rounded-full"
                  >
                    <PlusMini />
                  </IconButton>
                }
              />
              <Popover.Portal>
                <Popover.Positioner side="top" align={align} sideOffset={8}>
                  <Popover.Popup className="z-50">
                    <EmojiPicker
                      onSelect={handleSelect}
                      searchPlaceholder={searchPlaceholder}
                      noResultsLabel={noResultsLabel}
                      loadingLabel={loadingLabel}
                    />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

export { ReactionPicker };
