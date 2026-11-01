import { screen } from "@testing-library/react";
import { renderWithProviders as render } from "../../../test/i18n";
import { describe, expect, it } from "vitest";
import { SkillStepsView } from ".";

describe("SkillStepsView", () => {
  it("names built-in actions, with their tag", () => {
    render(
      <SkillStepsView
        steps={[
          { id: "h", type: "tool", toolId: "system:handoff" },
          { id: "t", type: "tool", toolId: "system:add_tag", action: "VIP" },
        ]}
      />,
    );
    expect(screen.getByText("Hand off to staff")).toBeTruthy();
    expect(screen.getByText("Add tag · VIP")).toBeTruthy();
  });
});
