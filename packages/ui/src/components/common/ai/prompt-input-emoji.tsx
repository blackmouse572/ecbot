import { FaceSmile } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { Popover } from "radix-ui";
import { useCallback, useState } from "react";
import { EmojiPicker } from "../emoji-picker";
import {
  PromptInputButton,
  type PromptInputButtonTooltip,
  usePromptInputTextField,
} from "./prompt-input";

export type PromptInputEmojiButtonProps = {
  tooltip?: PromptInputButtonTooltip;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  loadingLabel?: string;
  disabled?: boolean;
  className?: string;
};

export const PromptInputEmojiButton = ({
  tooltip = "Emoji",
  searchPlaceholder,
  noResultsLabel,
  loadingLabel,
  disabled,
  className,
}: PromptInputEmojiButtonProps) => {
  const [open, setOpen] = useState(false);
  const textField = usePromptInputTextField();

  const handleSelect = useCallback(
    (emoji: string) => {
      textField?.insertText(emoji);
      setOpen(false);
    },
    [textField],
  );

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <PromptInputButton
          aria-label="Insert emoji"
          className={clx(className)}
          disabled={disabled}
          tooltip={tooltip}
          type="button"
          variant="transparent"
        >
          <FaceSmile className="size-4" />
        </PromptInputButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" className="z-50 p-0" sideOffset={8}>
          <EmojiPicker
            loadingLabel={loadingLabel}
            noResultsLabel={noResultsLabel}
            onSelect={handleSelect}
            searchPlaceholder={searchPlaceholder}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
