import type { SkillStep } from "@repo/agent-blueprint";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders as render } from "../../../test/i18n";
import { SkillStepsEditor } from ".";

// A real browser applies :hover and :focus-within; here we check the classes
// that drive each state and the DOM shape those selectors rely on.
const NEAREST_HOVER =
  "[.step-group:hover:not(:has(.step-group:hover))>*>&:not(:hover,:focus-visible)]:text-ui-fg-subtle";

const NEAREST_FOCUS =
  "[.step-group:focus-within:not(:has(.step-group:focus-within))>*>&:not(:hover,:focus-visible)]:text-ui-fg-subtle";

const steps: SkillStep[] = [
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
    otherwise: [],
  },
];

const addButtons = () => [
  ...screen.getAllByRole("button", { name: "Add step" }),
  screen.getByRole("button", { name: "Else if" }),
];

describe("SkillStepsEditor surface", () => {
  it("sits on the standard card surface, not the darker fill", () => {
    const { container } = render(
      <SkillStepsEditor steps={steps} onChange={() => {}} showIssues={false} />,
    );
    const card = container.firstElementChild;

    expect(card).toHaveClass("bg-ui-bg-base", "rounded-lg", "border");
    expect(card).not.toHaveClass("bg-ui-bg-subtle");
    // Branches are set apart by the left rule only, never a darker fill.
    expect(container.querySelector("[class*='bg-ui-bg-subtle']")).toBeNull();
    expect(container.querySelectorAll(".border-l").length).toBe(2);
  });

  it("keeps add buttons quiet at rest, brighter in their own group, brightest on their own hover or focus", () => {
    render(
      <SkillStepsEditor steps={steps} onChange={() => {}} showIssues={false} />,
    );

    // Root list, If branch, Else: three Add step buttons, plus Else if.
    expect(addButtons()).toHaveLength(4);
    for (const button of addButtons()) {
      expect(button).toHaveClass(
        "text-ui-fg-muted",
        "font-normal",
        "txt-compact-small",
        NEAREST_HOVER,
        NEAREST_FOCUS,
        "hover:text-ui-fg-base",
        "focus-visible:text-ui-fg-base",
      );
      expect(button).not.toHaveClass("hidden", "invisible", "opacity-0");
      expect(button).not.toHaveAttribute("tabindex", "-1");
      expect(button.querySelector("svg")).toHaveClass("size-2.5");
    }
  });

  it("puts each add button's row directly in the group it belongs to, so nested groups don't light up their parents", () => {
    render(
      <SkillStepsEditor steps={steps} onChange={() => {}} showIssues={false} />,
    );
    const owners = addButtons().map((b) => b.parentElement?.parentElement);

    for (const owner of owners) expect(owner).toHaveClass("step-group");
    // Root list, If branch, Else list and the If itself: four groups.
    const groups = new Set(owners);

    expect(groups.size).toBe(4);
  });
});
