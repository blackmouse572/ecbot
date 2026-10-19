import "@/i18n";
import { mockWorkspaceAnalytics } from "@/hooks/api/workspace-analytics.mock";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversionSection } from "./conversion-section";

const base = mockWorkspaceAnalytics("30d").conversion;

describe("ConversionSection", () => {
  it("shows the time to order when the period has orders", () => {
    render(<ConversionSection data={base} />);
    expect(screen.getByText("Time to order")).toBeTruthy();
  });

  it("hides the time to order when the period has no orders", () => {
    const byChannel = base.byChannel.map((row) => ({ ...row, orders: 0 }));
    render(<ConversionSection data={{ ...base, byChannel }} />);
    expect(screen.queryByText("Time to order")).toBeNull();
  });
});
