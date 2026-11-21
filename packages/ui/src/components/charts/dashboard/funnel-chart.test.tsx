import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

// jsdom lays nothing out, so give every box 320x176 for the chart to measure.
// The two stages split that width: the first ends at x=160.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ width: 320, height: 176 }),
  );
});
// Recharts handles a mouse move on the next animation frame.
const hover = async (container: HTMLElement, clientX: number) => {
  fireEvent.mouseMove(container.querySelector(".recharts-wrapper")!, {
    clientX,
    clientY: 80,
  });
  await act(() => new Promise(requestAnimationFrame));
};
const tooltip = (container: HTMLElement) =>
  container.querySelector(".recharts-tooltip-wrapper");

describe("FunnelChart", () => {
  it("shows no stage details until the chart is hovered", () => {
    const { container } = render(<FunnelChart {...props} />);
    expect(tooltip(container)?.textContent ?? "").toBe("");
  });

  it("follows the pointer and shows each channel's count and share at that stage", async () => {
    const { container } = render(<FunnelChart {...props} />);
    await hover(container, 220);

    const tip = tooltip(container)!.textContent;
    expect(tip).toContain("Engaged");
    expect(tip).toContain("Messenger");
    expect(tip).toContain("40");
    expect(tip).toContain("50%");
    expect(tip).toContain("Zalo");
    expect(tip).toContain("25%");
    expect(tip).toContain("55 stopped (55%)");

    await hover(container, 60);
    const first = tooltip(container)!.textContent;
    expect(first).toContain("New customers");
    expect(first).toContain("Zalo");
    // The first stage has no share of itself and no drop before it.
    expect(first).not.toMatch(/%|stopped/);
  });

  it("shows a series' logo in place of its colour dot", async () => {
    const series = props.series.map((s) => ({ ...s, icon: `/${s.key}.svg` }));
    const { container } = render(<FunnelChart {...props} series={series} />);
    const legendLogos = [...container.querySelectorAll("ul img")].map((img) =>
      img.getAttribute("src"),
    );
    expect(legendLogos).toEqual(["/messenger.svg", "/zalo.svg"]);

    await hover(container, 220);
    expect(
      tooltip(container)!.querySelectorAll("img[src='/zalo.svg']"),
    ).toHaveLength(1);
  });
});
