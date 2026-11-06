import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FunnelChart } from "./funnel-chart";

const props = {
  stages: [
    { key: "new", label: "New customers" },
    { key: "engaged", label: "Engaged" },
  ],
  series: [
    { key: "messenger", label: "Messenger", color: "#00f", counts: [80, 40] },
    { key: "zalo", label: "Zalo", color: "#0af", counts: [20, 5] },
  ],
  emptyLabel: "No data",
  formatShare: (count: number, of: number) =>
    `${Math.round((count / of) * 100)}%`,
  dropLabel: (lost: number, share: string) => `${lost} stopped (${share})`,
};

describe("FunnelChart", () => {
  it("shows no stage details until a stage is hovered", () => {
    render(<FunnelChart {...props} />);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows each channel's count and share when hovering a stage", () => {
    render(<FunnelChart {...props} />);
    fireEvent.mouseEnter(screen.getByLabelText("Engaged"));

    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toContain("Engaged");
    expect(tip.textContent).toContain("Messenger");
    expect(tip.textContent).toContain("40");
    expect(tip.textContent).toContain("50%");
    expect(tip.textContent).toContain("Zalo");
    expect(tip.textContent).toContain("25%");
    expect(tip.textContent).toContain("55 stopped (55%)");
  });

  it("opens on keyboard focus and closes when the pointer leaves", () => {
    render(<FunnelChart {...props} />);
    const stage = screen.getByLabelText("New customers");
    fireEvent.focus(stage);
    expect(screen.getByRole("tooltip").textContent).toContain("Zalo");
    fireEvent.mouseLeave(stage);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
