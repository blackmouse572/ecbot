import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Meter } from "./meter";

describe("Meter", () => {
  it("adds no stray text to the meter (Base UI's hidden 'x' placeholder)", () => {
    const { container } = render(
      <Meter value={40} max={100}>
        <Meter.Label>Tokens</Meter.Label>
        <Meter.Value />
        <Meter.Track>
          <Meter.Indicator />
        </Meter.Track>
      </Meter>,
    );

    const meter = screen.getByRole("meter");

    expect(meter.textContent).toBe("Tokens40%");

    const hiddenX = [...container.querySelectorAll("span")].filter(
      (span) => span.textContent === "x",
    );

    expect(hiddenX).toHaveLength(0);
  });

  it("is named by its label and reads out its value", () => {
    render(
      <Meter value={40} max={100} className="mt-4">
        <Meter.Label>Tokens</Meter.Label>
        <Meter.Track>
          <Meter.Indicator />
        </Meter.Track>
      </Meter>,
    );

    const meter = screen.getByRole("meter", { name: "Tokens" });

    expect(meter.getAttribute("aria-valuenow")).toBe("40");
    expect(meter.getAttribute("aria-valuetext")).toBe("40%");
    expect(meter.className).toContain("mt-4");
  });
});
