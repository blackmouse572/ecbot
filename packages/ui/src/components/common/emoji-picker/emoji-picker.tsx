import { MagnifyingGlassMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { EmojiPicker as PrimitiveEmojiPicker } from "frimousse";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  loadingLabel?: string;
}

const EmojiPicker = ({
  onSelect,
  className,
  searchPlaceholder = "Search emoji…",
  noResultsLabel = "No emoji found.",
  loadingLabel = "Loading…",
}: EmojiPickerProps) => {
  return (
    <PrimitiveEmojiPicker.Root
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
      className={clx(
        "shadow-elevation-flyout bg-ui-bg-base flex w-[320px] flex-col rounded-[8px] p-1",
        className,
      )}
    >
      <div className="text-ui-fg-muted relative flex items-center px-2 py-1">
        <MagnifyingGlassMini className="pointer-events-none absolute left-3" />
        <PrimitiveEmojiPicker.Search
          placeholder={searchPlaceholder}
          className={clx(
            "txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted",
            "bg-ui-bg-field hover:bg-ui-bg-field-hover shadow-borders-base",
            "focus:shadow-borders-interactive-with-active transition-fg",
            "h-8 w-full rounded-md py-1.5 pr-2 pl-8 outline-none",
          )}
        />
      </div>
      <PrimitiveEmojiPicker.Viewport className="relative h-[300px] w-full overflow-y-auto">
        <PrimitiveEmojiPicker.Loading className="text-ui-fg-subtle txt-compact-small absolute inset-0 flex items-center justify-center">
          {loadingLabel}
        </PrimitiveEmojiPicker.Loading>
        <PrimitiveEmojiPicker.Empty className="text-ui-fg-subtle txt-compact-small absolute inset-0 flex items-center justify-center">
          {noResultsLabel}
        </PrimitiveEmojiPicker.Empty>
        <PrimitiveEmojiPicker.List
          className="select-none"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                {...props}
                className="bg-ui-bg-base text-ui-fg-subtle txt-compact-small-plus px-2 py-1"
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div {...props} className="scroll-my-1 px-1">
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                {...props}
                className={clx(
                  "transition-fg hover:bg-ui-bg-base-hover flex size-8 items-center justify-center rounded text-lg",
                  {
                    "bg-ui-bg-base-hover": emoji.isActive,
                  },
                )}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </PrimitiveEmojiPicker.Viewport>
    </PrimitiveEmojiPicker.Root>
  );
};

export { EmojiPicker };
export type { EmojiPickerProps };
