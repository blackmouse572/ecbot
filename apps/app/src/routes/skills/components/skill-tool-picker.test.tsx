import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SkillStepsDataProvider,
  SkillToolPicker,
  type SkillStepsData,
} from "@repo/ui/skill-steps";
import type { ReactElement } from "react";

const list = vi.hoisted(() => ({ searches: [] as string[] }));

const data: SkillStepsData = {
  useToolList: (search: string) => {
    list.searches.push(search);
    return {
      tools: [
        { id: "t1", kind: "MCP", displayName: "Google Calendar" },
        { id: "t2", kind: "HTTP", displayName: "Order lookup" },
      ],
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    };
  },
  useTool: () => undefined,
};

const renderPicker = (ui: ReactElement) =>
  render(<SkillStepsDataProvider value={data}>{ui}</SkillStepsDataProvider>);

describe("SkillToolPicker", () => {
  it("lists built-in actions and workspace tools, and searches tools on the server", () => {
    const onChange = vi.fn();
    renderPicker(<SkillToolPicker value="" onChange={onChange} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByText("Hand off to staff")).toBeTruthy();
    expect(screen.getByText("Google Calendar")).toBeTruthy();

    fireEvent.change(input, { target: { value: "hand" } });
    expect(list.searches.at(-1)).toBe("hand");
    expect(screen.queryByText("Notify the team")).toBeNull();
  });

  it("shows the selected tool's name even when it is not in the loaded page", () => {
    renderPicker(
      <SkillToolPicker
        value="t9"
        selected={{ id: "t9", kind: "HTTP", displayName: "Old tool" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Old tool").length).toBeGreaterThan(0);
  });
});
