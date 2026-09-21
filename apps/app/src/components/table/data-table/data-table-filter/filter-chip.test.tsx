import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover as RadixPopover } from "radix-ui";
import { describe, expect, it, vi } from "vitest";
import FilterChip from "./filter-chip";

describe("FilterChip", () => {
  it("stays clickable to reopen its popover before any value has been picked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    // A freshly added filter (openOnMount) has no value yet - this is the
    // state the chip is in right after the auto-open closes without a pick.
    const { container } = render(
      <RadixPopover.Root open={false} onOpenChange={onOpenChange}>
        <FilterChip label="Loại" onRemove={vi.fn()} />
      </RadixPopover.Root>,
    );

    const trigger = container.querySelector('[aria-haspopup="dialog"]');
    expect(trigger).not.toBeNull();

    await user.click(trigger as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("does not render a separate empty Anchor once the Trigger always exists", () => {
    // A leftover <Popover.Anchor/> with no size make the popover position
    // itself off the zero-size anchor instead of the (now always present)
    // Trigger, so it opens but never becomes visible. The chip's first
    // child must be the label block, not a blank anchor div.
    const { container } = render(
      <RadixPopover.Root open={false} onOpenChange={vi.fn()}>
        <FilterChip label="Loại" onRemove={vi.fn()} />
      </RadixPopover.Root>,
    );

    const wrapper = container.querySelector(".bg-ui-bg-field") as HTMLElement;
    expect(wrapper.children[0]).toHaveTextContent("Loại");
  });
});
