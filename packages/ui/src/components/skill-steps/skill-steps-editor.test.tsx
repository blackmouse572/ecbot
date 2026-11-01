import type { SkillStep } from "@repo/agent-blueprint";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders as render } from "../../../test/i18n";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  SkillStepsDataProvider,
  SkillStepsEditor,
  type SkillStepsData,
} from ".";

let latest: SkillStep[] = [];
const Harness = ({
  initial,
  showIssues = false,
  data,
}: {
  initial: SkillStep[];
  showIssues?: boolean;
  data?: SkillStepsData;
}) => {
  const [steps, setSteps] = useState(initial);
  latest = steps;
  const editor = (
    <SkillStepsEditor
      steps={steps}
      onChange={setSteps}
      showIssues={showIssues}
    />
  );
  return data ? (
    <SkillStepsDataProvider value={data}>{editor}</SkillStepsDataProvider>
  ) : (
    editor
  );
};

describe("SkillStepsEditor", () => {
  it("edits a step's text and an If's condition, numbered like the prompt", () => {
    render(
      <Harness
        initial={[
          { id: "a", type: "ask", text: "" },
          {
            id: "i",
            type: "if",
            branches: [
              {
                id: "b",
                condition: "",
                steps: [{ id: "c", type: "tell", text: "C" }],
              },
            ],
          },
        ]}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/What to ask for/), {
      target: { value: "The order code" },
    });
    fireEvent.change(screen.getByPlaceholderText(/The condition/), {
      target: { value: "Not found" },
    });
    expect(latest[0]).toMatchObject({ text: "The order code" });
    expect(latest[1]).toMatchObject({ branches: [{ condition: "Not found" }] });
    expect(screen.getByText("2.1")).toBeTruthy();
  });

  it("adds an Else if and an Else to an If", () => {
    render(
      <Harness
        initial={[
          {
            id: "i",
            type: "if",
            branches: [{ id: "b", condition: "x", steps: [] }],
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Else if" }));
    fireEvent.click(screen.getByRole("button", { name: "Else" }));
    expect(latest[0]).toMatchObject({ otherwise: [] });
    expect((latest[0] as { branches: unknown[] }).branches).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Else" })).toBeNull();
  });

  it("shows why a step cannot be saved once asked to", () => {
    render(
      <Harness
        showIssues
        initial={[
          { id: "a", type: "ask", text: "" },
          { id: "t", type: "tool", toolId: "system:add_tag" },
        ]}
      />,
    );
    expect(screen.getByText("Write what this step says.")).toBeTruthy();
    expect(
      screen.getByText("Pick the tag or write the field name."),
    ).toBeTruthy();
  });

  it("takes a typed tag name when there is no tag list (a builtin template)", () => {
    render(
      <Harness
        initial={[{ id: "t", type: "tool", toolId: "system:add_tag" }]}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Tag name, e.g. VIP"), {
      target: { value: "VIP" },
    });
    expect(latest[0]).toMatchObject({ action: "VIP" });
  });

  it("picks the tag from the workspace's tags when they are given", () => {
    render(
      <Harness
        initial={[{ id: "t", type: "tool", toolId: "system:add_tag" }]}
        data={{
          useToolList: () => ({ tools: [] }),
          useTool: () => undefined,
          tagNames: ["VIP", "Wholesale"],
        }}
      />,
    );
    expect(screen.queryByPlaceholderText("Tag name, e.g. VIP")).toBeNull();
    fireEvent.focus(screen.getAllByRole("combobox").at(-1)!);
    expect(screen.getByText("Wholesale")).toBeTruthy();
  });
});
