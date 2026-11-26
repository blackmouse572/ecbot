import { clx } from "@medusajs/ui";
import type { FC } from "react";
import type { MessageVariable } from "../utils/message-variables";

type SendVariableSuggestProps = {
  items: MessageVariable[];
  active: number;
  label: (key: MessageVariable) => string;
  left: number;
  top: number;
  onPick: (key: MessageVariable) => void;
};

/** The placeholders that fit what the shop typed after `{`, under the cursor. */
export const SendVariableSuggest: FC<SendVariableSuggestProps> = ({
  items,
  active,
  label,
  left,
  top,
  onPick,
}) => (
  <div
    role="listbox"
    style={{ left, top }}
    className="bg-ui-bg-component shadow-elevation-flyout absolute z-10 flex min-w-40 flex-col rounded-lg p-1"
  >
    {items.map((key, i) => (
      <button
        key={key}
        type="button"
        role="option"
        aria-selected={i === active}
        // Keep the editor focused, so the chip lands where the cursor is.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(key)}
        className={clx(
          "txt-compact-small text-ui-fg-base rounded-md px-2 py-1.5 text-left outline-none",
          i === active
            ? "bg-ui-bg-component-hover"
            : "hover:bg-ui-bg-component-hover",
        )}
      >
        {`{${label(key)}}`}
      </button>
    ))}
  </div>
);
