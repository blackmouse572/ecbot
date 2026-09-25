import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const reducedMotion = vi.hoisted(() => ({ value: false }));

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

import { BuildingLoader } from "./ai-loader";

// The pixel grid cycles its pattern on an 800ms interval.
const patternTimers = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.filter((call) => call[1] === 800);

describe("BuildingLoader", () => {
  afterEach(() => {
    reducedMotion.value = false;
    vi.restoreAllMocks();
  });

  it("cycles the pixel-grid pattern by default", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    render(<BuildingLoader state="Thinking" />);
    expect(patternTimers(spy)).toHaveLength(1);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("shows a static frame with reduced motion", () => {
    reducedMotion.value = true;
    const spy = vi.spyOn(globalThis, "setInterval");
    render(<BuildingLoader state="Thinking" />);
    expect(patternTimers(spy)).toHaveLength(0);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });
});
