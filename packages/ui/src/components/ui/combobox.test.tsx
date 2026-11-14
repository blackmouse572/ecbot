import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./combobox";

const MODELS = ["Claude Sonnet 5", "GPT-5.1", "DeepSeek V4.1 Flash"];

function ModelPickerInModalDialog() {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState<string | null>(MODELS[0]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Content aria-describedby={undefined}>
          <Dialog.Title>Settings</Dialog.Title>
          <output data-testid="picked">{value}</output>
          <output data-testid="dialog-state">
            {open ? "open" : "closed"}
          </output>
          <Combobox<string>
            items={MODELS}
            value={value}
            onValueChange={(model) => model && setValue(model)}
            defaultOpen
            filter={() => true}
          >
            <ComboboxInput placeholder="Search model" triggerLabel="Open models" />
            <ComboboxContent>
              <ComboboxList>
                {(model: string) => (
                  <ComboboxItem key={model} value={model}>
                    {model}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

describe("Combobox", () => {
  it("picks a model inside a modal drawer without dismissing it", async () => {
    render(<ModelPickerInModalDialog />);

    // A modal Radix Dialog (Medusa's Drawer and Dialog) sets
    // pointer-events: none on the body. The popup is portaled to the body, so
    // it inherits that lock: wheel and click hit-tests fall through to the
    // drawer and the list can neither be scrolled nor clicked.
    await waitFor(() =>
      expect(document.body.style.pointerEvents).toBe("none"),
    );
    await screen.findByRole("listbox");

    const popup = document.querySelector<HTMLElement>(
      '[data-slot="combobox-content"]',
    );

    expect(popup).not.toBeNull();
    expect(window.getComputedStyle(popup as HTMLElement).pointerEvents).toBe(
      "auto",
    );

    const option = screen.getByRole("option", { name: "GPT-5.1" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    await waitFor(() =>
      expect(screen.getByTestId("picked").textContent).toBe("GPT-5.1"),
    );
    expect(screen.getByTestId("dialog-state").textContent).toBe("open");
  });
});
