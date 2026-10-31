import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "./tag-input";

function Harness({ onChange }: { onChange: (v: string[]) => void }) {
  const [value, setValue] = useState(["E-commerce"]);
  return (
    <TagInput
      value={value}
      suggestions={["Inventory"]}
      placeholder="Add a category"
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("TagInput", () => {
  it("shows the current tags", () => {
    render(<Harness onChange={vi.fn()} />);
    expect(screen.getByText("E-commerce")).toBeInTheDocument();
  });

  it("adds typed text as a new tag on Enter", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.type(screen.getByRole("combobox"), "Bán lẻ{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["E-commerce", "Bán lẻ"]);
  });

  it("adds typed text on a comma", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.type(screen.getByRole("combobox"), "POS,");

    expect(onChange).toHaveBeenLastCalledWith(["E-commerce", "POS"]);
  });
});
