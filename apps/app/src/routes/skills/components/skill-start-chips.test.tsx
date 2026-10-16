import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));
vi.mock("@/hooks/api/skills", () => ({
  useListSkills: () => ({
    skills: [{ id: "t1", name: "Refund policy" }],
  }),
  skillDetailQueryOptions: () => ({
    queryKey: ["skill", "t1"],
    queryFn: () => new Promise(() => {}),
  }),
}));

import { SkillStartChips } from "./skill-start-chips";

describe("SkillStartChips", () => {
  it("keeps the label and the chip's shape while a template loads", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SkillStartChips onTemplate={vi.fn()} onImport={vi.fn()} />
      </QueryClientProvider>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Refund policy" }),
    );

    const chip = screen.getByRole("button", { name: "Refund policy" });
    expect(chip).toBeDisabled();
    // Button's isLoading would wrap the content in a block span, which
    // stacks the icon above the label and makes the chip taller.
    expect(chip.querySelector("span")).toBeNull();
  });
});
