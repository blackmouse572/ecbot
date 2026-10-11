import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Form } from "./form";

describe("Form.Item", () => {
  // `space-y-2` adds a margin on top of the flex gap, doubling the space
  // between label and input, and pushes the second child down in a row layout.
  it("spaces children with the flex gap only", () => {
    render(<Form.Item data-testid="item" />);
    const item = screen.getByTestId("item");

    expect(item).toHaveClass("flex", "flex-col", "gap-y-2");
    expect(item.className).not.toMatch(/space-y-/);
  });

  it("keeps a row layout free of vertical margins", () => {
    render(
      <Form.Item
        data-testid="item"
        className="flex-row items-center gap-x-2"
      />,
    );

    expect(screen.getByTestId("item").className).not.toMatch(/space-y-/);
  });
});
