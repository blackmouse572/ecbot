import "@/i18n";
import type { SkillStep } from "@repo/agent-blueprint";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SkillStepsEditor } from "./skill-steps-editor";

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "ws" }),
}));
vi.mock("@/hooks/api/tools", () => ({
  useGetTool: () => ({ tool: undefined }),
  useInfiniteToolList: () => ({ tools: [] }),
}));
vi.mock("@/hooks/api/customer-tags", () => ({
  useCustomerTagList: () => ({ tags: [] }),
}));

let latest: SkillStep[] = [];
const Harness = ({
  initial,
  showIssues = false,
}: {
  initial: SkillStep[];
  showIssues?: boolean;
}) => {
  const [steps, setSteps] = useState(initial);
  latest = steps;
  return (
    <SkillStepsEditor
      steps={steps}
      onChange={setSteps}
      showIssues={showIssues}
    />
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
});
