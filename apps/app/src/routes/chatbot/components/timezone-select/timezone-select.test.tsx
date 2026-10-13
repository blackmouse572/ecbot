import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimezoneSelect } from "./timezone-select";

// jsdom has no layout, so the real virtualizer measures zero rows. Render the
// first rows only, which is also what proves the list is windowed.
const scrollToIndex = vi.fn();

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    scrollToIndex,
    getTotalSize: () => count * 32,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, index) => ({
        index,
        size: 32,
        start: index * 32,
      })),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// cmdk scrolls the active item into view; jsdom does not implement it.
Element.prototype.scrollIntoView = vi.fn();

describe("TimezoneSelect", () => {
  it("shows the default state when no timezone is set", () => {
    render(<TimezoneSelect value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent(
      "chatbot.create.timezoneDefault",
    );
  });

  it("renders only a window of the zone list", async () => {
    render(<TimezoneSelect value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    // 10 windowed zones + the default row, out of ~420 zones.
    expect(screen.getAllByRole("option")).toHaveLength(11);
  });

  it("selects a zone found by search", async () => {
    const onChange = vi.fn();
    render(<TimezoneSelect value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.type(screen.getByRole("combobox"), "bangkok");
    await userEvent.click(
      screen.getByRole("option", { name: /Asia\/Bangkok/ }),
    );
    expect(onChange).toHaveBeenCalledWith("Asia/Bangkok");
  });

  it("clears back to the default", async () => {
    const onChange = vi.fn();
    render(<TimezoneSelect value="Asia/Bangkok" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(
      screen.getByRole("option", { name: /chatbot.create.timezoneDefault/ }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("checks a zone stored under its old ICU id", async () => {
    render(<TimezoneSelect value="Asia/Saigon" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    expect(
      screen.getByRole("option", { name: /Asia\/Ho_Chi_Minh/ }),
    ).toHaveAttribute("data-checked", "true");
  });

  it("opens scrolled to the selected zone", async () => {
    scrollToIndex.mockClear();
    render(<TimezoneSelect value="Asia/Bangkok" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: "center" });
  });
});
