import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LearnedCycleCell } from "./learned-cycle-cell";

const group = { id: "g-1", name: "Serum", createdAt: "" };

describe("LearnedCycleCell", () => {
  it("shows the learned cycle and the repurchases behind it", () => {
    render(
      <LearnedCycleCell
        group={{ ...group, learnedRepurchaseDays: 41, repurchasePairs: 38 }}
      />,
    );

    expect(screen.getByText("41 days")).toBeTruthy();
    expect(screen.getByText("from 38 repurchases")).toBeTruthy();
  });

  it("counts the repurchases still needed before the cycle is learned", () => {
    render(<LearnedCycleCell group={{ ...group, repurchasePairs: 3 }} />);

    expect(screen.getByText("2 more repurchases needed")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("3");
  });
});
